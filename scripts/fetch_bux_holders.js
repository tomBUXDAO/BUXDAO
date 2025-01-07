import { Pool } from '@vercel/postgres';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BUX_TOKEN = 'FMiRxSbLqRTWiBszt1DZmXd7SrscWCccY7fcXNtwWxHK';
const SOLSCAN_API = 'https://public-api.solscan.io';

async function fetchHolders(offset = 0, limit = 50) {
  try {
    const response = await axios.get(
      `${SOLSCAN_API}/token/holders?tokenAddress=${BUX_TOKEN}&offset=${offset}&limit=${limit}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BUXDAO/1.0'
        },
        timeout: 5000 // 5 second timeout
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Solscan API error:', error.response.status, error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response from Solscan API:', error.message);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request:', error.message);
    }
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
    let offset = 0;
    const limit = 50;
    let hasMore = true;
    let totalUpdated = 0;

    console.log('Starting BUX holders update...');

    while (hasMore) {
      try {
        console.log(`Fetching holders from offset ${offset}...`);
        const data = await fetchHolders(offset, limit);
        
        if (!data.data || data.data.length === 0) {
          console.log('No more holders found');
          hasMore = false;
          break;
        }

        // Begin transaction
        await pool.query('BEGIN');

        try {
          for (const holder of data.data) {
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
              [holder.owner, holder.amount / 1e9] // Convert from lamports to BUX
            );

            if (result.rowCount > 0) {
              totalUpdated++;
            }
          }

          // Commit transaction
          await pool.query('COMMIT');
          console.log(`Processed ${data.data.length} holders (offset: ${offset})`);

        } catch (error) {
          // Rollback transaction on error
          await pool.query('ROLLBACK');
          console.error('Database error:', error);
          throw error;
        }

        offset += limit;
        
        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error processing batch at offset ${offset}:`, error);
        // If we hit an error, wait a bit longer before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        // Don't increment offset so we retry the same batch
      }
    }

    console.log(`Finished updating BUX holders. Total updated: ${totalUpdated}`);

  } catch (error) {
    console.error('Fatal error updating BUX holders:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
console.log('Starting script...');
updateBuxHolders()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 