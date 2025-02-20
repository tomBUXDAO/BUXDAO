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

// Configure a single client for serverless environment
let client = null;
let connecting = null;

async function getClient() {
  // Return existing client if it's already connected
  if (client?.connection?.stream?.readable) {
    return client;
  }

  // Wait for existing connection attempt if one is in progress
  if (connecting) {
    return connecting;
  }

  // Create new connection
  connecting = new Promise(async (resolve, reject) => {
    try {
      const pool = new Pool({
        connectionString,
        max: 1,
        connectionTimeoutMillis: 10000,
        ssl: {
          rejectUnauthorized: false
        }
      });

      client = await pool.connect();
      console.log('New database connection established');
      
      // Handle connection errors
      client.on('error', err => {
        console.error('Client error:', err);
        client = null;
      });

      resolve(client);
    } catch (error) {
      console.error('Connection error:', error);
      client = null;
      reject(error);
    } finally {
      connecting = null;
    }
  });

  return connecting;
}

// Export the getClient function
export { getClient };

// Test the connection
getClient()
  .then(client => {
    console.log('Initial database connection successful');
    client.release();
  })
  .catch(err => {
    console.error('Initial database connection failed:', err);
  }); 