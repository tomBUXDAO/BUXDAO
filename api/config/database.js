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
  connectionTimeoutMillis: 10000, // 10 second timeout for cold starts
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  allowExitOnIdle: true,
  ssl: {
    rejectUnauthorized: false // Required for Neon database
  }
});

// Add error handler to the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Terminate on pool errors to trigger container restart
});

// Add connection handler
pool.on('connect', (client) => {
  console.log('New database connection established');
  client.on('error', err => {
    console.error('Client error:', err);
  });
});

// Export a function to test the connection
export async function testConnection() {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection test successful:', result.rows[0]);
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
      process.exit(1); // Exit on connection failure to trigger container restart
    }
  })
  .catch(err => {
    console.error('Error during initial connection test:', err);
    process.exit(1);
  }); 