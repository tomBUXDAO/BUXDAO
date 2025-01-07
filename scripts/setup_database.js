import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

async function setupDatabase() {
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
    console.log('Setting up database...');
    
    // Begin transaction
    await pool.query('BEGIN');

    try {
      // Create the bux_holders table if it doesn't exist
      await pool.query(`
        CREATE TABLE IF NOT EXISTS bux_holders (
          wallet_address TEXT PRIMARY KEY,
          token_account TEXT,
          balance DECIMAL(20,2),
          percentage DECIMAL(10,2),
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Commit transaction
      await pool.query('COMMIT');
      console.log('Successfully set up database');

    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
console.log('Starting database setup...');
setupDatabase()
  .then(() => {
    console.log('Setup completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  }); 