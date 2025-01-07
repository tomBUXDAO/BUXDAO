import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables
dotenv.config();

const { Pool } = pg;

async function importHolders() {
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
    console.log('Starting BUX holders import...');
    
    // Read CSV data from file
    const csvPath = path.join(process.cwd(), 'data', 'bux_holders.csv');
    const csvData = await fs.readFile(csvPath, 'utf8');
    
    // Parse CSV data
    const lines = csvData.split('\n');
    const holders = lines
      .slice(1) // Skip header row
      .filter(line => line.trim()) // Remove empty lines
      .map(line => {
        const [wallet_address, token_account, quantity] = line.split(',');
        return {
          wallet_address,
          balance: parseFloat(quantity)
        };
      })
      .filter(holder => !isNaN(holder.balance)); // Filter out any invalid entries

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
            [holder.wallet_address, holder.balance]
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
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`\nFinished importing BUX holders. Total updated: ${totalUpdated}`);

  } catch (error) {
    console.error('\nFatal error importing BUX holders:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
console.log('Starting BUX holders import script...\n');
importHolders()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nScript failed:', error.message);
    process.exit(1);
  }); 