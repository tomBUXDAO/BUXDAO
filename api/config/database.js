import pg from 'pg';
const { Pool } = pg;

// In production, environment variables are set through the platform
// In development, we load from .env file
if (process.env.NODE_ENV !== 'production') {
  const { fileURLToPath } = await import('url');
  const { dirname, resolve } = await import('path');
  const { default: dotenv } = await import('dotenv');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  // Load .env file in development only
  dotenv.config({ path: resolve(__dirname, '../../.env') });
}

console.log('Database configuration check:', {
  hasPostgresUrl: !!process.env.POSTGRES_URL,
  nodeEnv: process.env.NODE_ENV || 'development'
});

if (!process.env.POSTGRES_URL) {
  console.error('Critical database configuration error:', {
    error: 'Missing POSTGRES_URL',
    nodeEnv: process.env.NODE_ENV,
    hint: process.env.NODE_ENV === 'production' 
      ? 'Ensure POSTGRES_URL is set in your production environment variables'
      : 'Ensure your .env file exists and contains POSTGRES_URL'
  });
  throw new Error('POSTGRES_URL environment variable is required');
}

// Parse the connection string
const connectionString = process.env.POSTGRES_URL;

// Configure the connection pool with appropriate settings for serverless
export const pool = new Pool({
  connectionString,
  max: 1, // Keep only 1 connection in serverless environment
  connectionTimeoutMillis: 5000, // 5 second timeout
  idleTimeoutMillis: 120000, // Close idle connections after 2 minutes
  allowExitOnIdle: true, // Allow the pool to exit when all clients are finished
  ssl: {
    rejectUnauthorized: false // Required for Neon database
  }
});

// Add error handler to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Add connection handler
pool.on('connect', (client) => {
  console.log('New database connection established');
  
  // Set session parameters
  client.query('SET statement_timeout = 5000')
    .catch(err => console.error('Error setting statement timeout:', err));
});

// Export a function to test the connection
export async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    await client.query('SELECT 1');
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  } finally {
    if (client) {
      try {
        await client.release();
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

// Initialize connection
testConnection()
  .then(success => {
    if (!success) {
      console.error('Failed to establish initial database connection');
    }
  })
  .catch(err => {
    console.error('Error during initial connection test:', err);
  }); 