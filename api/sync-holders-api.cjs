const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');

// Configuration
const RPC_ENDPOINT = process.env.QUICKNODE_RPC_URL;
const CRON_SECRET = process.env.CRON_SECRET_TOKEN;

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

module.exports = async (req, res) => {
  // Only allow GET from cron job or POST from authorized sources
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for cron job authentication
  const authHeader = req.headers.authorization;
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  
  if (!isVercelCron && (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let client;
  try {
    // Dynamically import the database module
    const { pool } = await import('./config/database.js');
    
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

    // Get client from shared pool
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
    return res.status(200).json({ 
      success: true, 
      holdersCount: currentHolders.length,
      timestamp: new Date().toISOString()
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
}; 