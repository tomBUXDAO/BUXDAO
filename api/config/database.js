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

// Create the pool for compatibility with existing code
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

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
      client = await pool.connect();
      
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

// Export both pool and getClient
export { pool, getClient };
