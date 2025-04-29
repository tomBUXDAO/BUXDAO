import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Pool } from 'pg';

// Configuration
const RPC_ENDPOINT = process.env.QUICKNODE_RPC_URL;
const DB_CONNECTION_STRING = process.env.POSTGRES_URL;

// Initialize database pool
const pool = new Pool({
  connectionString: DB_CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false
  }
});

async function getTokenHolders(connection, mintAddress) {
  console.log(`Fetching token holders for mint: ${mintAddress}`);
  
  const mint = new PublicKey(mintAddress);
  
  // Get mint info to get decimals
  const mintInfo = await connection.getParsedAccountInfo(mint);
  const decimals = (mintInfo.value?.data)?.parsed.info.decimals || 9;
  
  // Get all token accounts for this mint
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      {
        dataSize: 165, // Size of token account
      },
      {
        memcmp: {
          offset: 0,
          bytes: mint.toBase58(),
        },
      },
    ],
  });
  
  // Process accounts and filter out zero balances
  const holders = accounts
    .map(account => {
      const data = account.account.data;
      const balance = data.readBigUInt64LE(64);
      const owner = new PublicKey(data.slice(32, 64));
      
      return {
        address: owner.toBase58(),
        balance: Number(balance) / Math.pow(10, decimals),
        rawBalance: balance.toString()
      };
    })
    .filter(holder => holder.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  
  return holders;
}

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East (N. Virginia)
};

export default async function handler(req) {
  // Only allow GET from cron job or POST from authorized sources
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Verify if request is from Vercel Cron
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  if (!isVercelCron && req.method === 'GET') {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let client;
  try {
    // Load the token mint address from environment
    const mintAddress = process.env.BUX_TOKEN_MINT_ADDRESS;
    if (!mintAddress) {
      throw new Error('Token mint address not configured');
    }

    // Initialize Solana connection
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Get current token holders
    const currentHolders = await getTokenHolders(connection, mintAddress);
    console.log(`Found ${currentHolders.length} holders`);

    // Get database connection
    client = await pool.connect();

    // Start transaction
    await client.query('BEGIN');

    // Update database
    for (const holder of currentHolders) {
      await client.query(
        `INSERT INTO bux_holders (wallet_address, balance, last_updated)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (wallet_address) 
         DO UPDATE SET 
           balance = $2,
           last_updated = CURRENT_TIMESTAMP`,
        [holder.address, holder.balance]
      );
    }

    // Remove holders that no longer exist
    const addresses = currentHolders.map(h => h.address);
    if (addresses.length > 0) {
      await client.query(
        `DELETE FROM bux_holders 
         WHERE wallet_address NOT IN (${addresses.map((_, i) => `$${i + 1}`).join(',')})`,
        addresses
      );
    }

    await client.query('COMMIT');
    
    console.log('Database sync completed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        holdersCount: currentHolders.length,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in sync process:', error);
    
    if (client) {
      await client.query('ROLLBACK');
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync holders',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
    
  } finally {
    if (client) {
      client.release();
    }
  }
} 