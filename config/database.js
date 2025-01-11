import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Add error handler
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Log additional details
  console.error('Error code:', err.code);
  console.error('Error detail:', err.detail);
  console.error('Error schema:', err.schema);
  console.error('Error table:', err.table);
  console.error('Error constraint:', err.constraint);
  
  // Attempt to reconnect
  testConnection().catch(reconnectErr => {
    console.error('Failed to reconnect:', reconnectErr);
  });
});

// Test the connection with retries
async function testConnection(retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('Database connected successfully at:', result.rows[0].now);
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${i + 1} failed:`, err);
      console.error('Connection error details:', {
        code: err.code,
        message: err.message,
        detail: err.detail
      });
      
      if (i === retries - 1) {
        console.error('All connection attempts failed');
        throw err;
      }
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

// Initial connection test
testConnection().catch(err => {
  console.error('Failed to establish initial database connection:', err);
  process.exit(1); // Exit if we can't connect to the database
});

export default pool; 