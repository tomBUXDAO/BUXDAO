import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment variables
dotenv.config();

async function addExemptColumn() {
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
    console.log('Adding is_exempt column to bux_holders table...');
    
    // Begin transaction
    await pool.query('BEGIN');

    try {
      // Add is_exempt column if it doesn't exist
      await pool.query(`
        ALTER TABLE bux_holders 
        ADD COLUMN IF NOT EXISTS is_exempt BOOLEAN DEFAULT FALSE
      `);

      // Commit transaction
      await pool.query('COMMIT');
      console.log('Successfully added is_exempt column');

    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error adding is_exempt column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
console.log('Starting migration script...');
addExemptColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 