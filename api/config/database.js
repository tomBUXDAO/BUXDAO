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

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

// Parse the connection string
const connectionString = process.env.POSTGRES_URL;

console.log('Initializing database connection pool...', {
  environment: process.env.NODE_ENV,
  hasConnectionString: !!connectionString,
  ssl: process.env.NODE_ENV === 'production'
});

// Create the pool for compatibility with existing code
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000 // Return an error after 2 seconds if connection could not be established
});

// Add pool error handler
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Add pool connect handler
pool.on('connect', client => {
  console.log('New client connected to pool');
});

// Add pool acquire handler
pool.on('acquire', client => {
  console.log('Client acquired from pool');
});

// Add pool remove handler
pool.on('remove', client => {
  console.log('Client removed from pool');
});

// Configure a single client for serverless environment
let client = null;
let connecting = null;

async function getClient() {
  // Return existing client if it's already connected
  if (client?.connection?.stream?.readable) {
    console.log('Reusing existing database connection');
    return client;
  }

  // Wait for existing connection attempt if one is in progress
  if (connecting) {
    console.log('Waiting for existing connection attempt...');
    return connecting;
  }

  console.log('Initiating new database connection...');

  // Create new connection
  connecting = new Promise(async (resolve, reject) => {
    try {
      client = await pool.connect();
      console.log('Successfully connected to database');
      
      // Handle connection errors
      client.on('error', err => {
        console.error('Client error:', err);
        client = null;
      });

      // Test the connection
      const result = await client.query('SELECT NOW()');
      console.log('Database connection test successful:', result.rows[0]);

      resolve(client);
    } catch (error) {
      console.error('Database connection error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      client = null;
      reject(error);
    } finally {
      connecting = null;
    }
  });

  return connecting;
}

// Export both pool and getClient
export { pool, getClient };
