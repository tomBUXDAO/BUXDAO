import pg from 'pg';
import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;
const BUX_TOKEN = new PublicKey('FMiRxSbLqRTWiBszt1DZmXd7SrscWCccY7fcXNtwWxHK');
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const RPC_ENDPOINT = 'https://ssc-dao.genesysgo.net';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff(fn, maxRetries = 5, initialDelay = 2000) {
  let retries = 0;
  let delay = initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }

      console.log(`Attempt ${retries} failed. Retrying in ${delay/1000} seconds...`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
}

async function fetchHolders() {
  try {
    console.log(`\nConnecting to RPC endpoint: ${RPC_ENDPOINT}`);
    const connection = new Connection(RPC_ENDPOINT, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000
    });

    // Get all token accounts for BUX token
    const { value: accounts } = await retryWithBackoff(
      () => connection.getTokenLargestAccounts(BUX_TOKEN),
      3,
      2000
    );

    console.log(`Found ${accounts.length} token accounts`);

    // Process accounts to get holder balances
    const holders = accounts
      .map(account => ({
        owner: account.address.toString(),
        amount: Number(account.amount) / 1e9 // Convert from lamports to BUX
      }))
      .filter(holder => holder.amount > 0); // Only include non-zero balances

    return holders;
  } catch (error) {
    console.error('Error fetching holders:', error.message);
    throw error;
  }
}

async function updateBuxHolders() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL environment variable is not set');
  }

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Starting BUX holders update...');
    
    // Fetch all holders
    const holders = await fetchHolders();
    console.log(`Processing ${holders.length} holders...`);

    let totalUpdated = 0;
    const batchSize = 50;

    // Process holders in batches
    for (let i = 0; i < holders.length; i += batchSize) {
      const batch = holders.slice(i, i + batchSize);
      
      // Begin transaction
      await pool.query('BEGIN');

      try {
        let batchUpdated = 0;
        for (const holder of batch) {
          // Insert or update holder
          const result = await pool.query(
            `INSERT INTO bux_holders (wallet_address, balance)
             VALUES ($1, $2)
             ON CONFLICT (wallet_address) 
             DO UPDATE SET 
               balance = $2,
               last_updated = CURRENT_TIMESTAMP
             WHERE bux_holders.balance != $2
             RETURNING *`,
            [holder.owner, holder.amount]
          );

          if (result.rowCount > 0) {
            batchUpdated++;
            totalUpdated++;
          }
        }

        // Commit transaction
        await pool.query('COMMIT');
        console.log(`Updated ${batchUpdated} holders in batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(holders.length/batchSize)}`);

      } catch (error) {
        // Rollback transaction on error
        await pool.query('ROLLBACK');
        throw error;
      }

      // Small delay between batches
      if (i + batchSize < holders.length) {
        await sleep(1000); // Increased delay between batches
      }
    }

    console.log(`\nFinished updating BUX holders. Total updated: ${totalUpdated}`);

  } catch (error) {
    console.error('\nFatal error updating BUX holders:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
console.log('Starting BUX holders update script...\n');
updateBuxHolders()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nScript failed:', error.message);
    process.exit(1);
  }); 