import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Pool } from 'pg';

// Configuration
const RPC_ENDPOINT = 'https://thrilling-purple-replica.solana-mainnet.quiknode.pro/628d12e42a5508dc3c9cec8fd7b3f120a03449f7/';
const DB_CONNECTION_STRING = 'postgresql://neondb_owner:ENy3VObxHTd4@ep-dry-dawn-a5hld2w4-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

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

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    // Load the token mint address from environment or config
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
    await client.query(
      `DELETE FROM bux_holders 
       WHERE wallet_address NOT IN (${addresses.map((_, i) => `$${i + 1}`).join(',')})`,
      addresses
    );

    await client.query('COMMIT');
    
    console.log('Database sync completed successfully');
    return res.status(200).json({ 
      success: true, 
      holdersCount: currentHolders.length 
    });

  } catch (error) {
    console.error('Error in sync process:', error);
    
    if (client) {
      await client.query('ROLLBACK');
    }
    
    return res.status(500).json({ 
      error: 'Failed to sync holders',
      details: error.message 
    });
    
  } finally {
    if (client) {
      client.release();
    }
  }
} 