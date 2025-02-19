import pkg from 'pg';
const { Pool } = pkg;

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
  throw new Error('Database connection failed: POSTGRES_URL is not set');
}

// Serverless-optimized pool configuration
const poolConfig = {
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 1, // Single connection for serverless
  min: 0, // Allow pool to empty
  idleTimeoutMillis: 50, // Very aggressive idle timeout
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  maxUses: 5, // Recycle connections after 5 uses
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 1000,
  application_name: 'buxdao_auth',
  statement_timeout: 5000,
  query_timeout: 5000,
  idle_in_transaction_session_timeout: 5000
};

const pool = new pkg.Pool(poolConfig);

// Aggressive connection cleanup
setInterval(() => {
  pool.on('acquire', (client) => {
    client.query('SELECT NOW()', [], (err) => {
      if (err) {
        console.error('Connection health check failed:', err);
        client.release(true); // Force release on error
      }
    });
  });
}, 15000);

// Enhanced error handling
pool.on('error', (err, client) => {
  console.error('Database pool error:', {
    error: err.message,
    code: err.code,
    detail: err.detail,
    hint: err.hint,
    client: client?.processID,
    environment: process.env.NODE_ENV
  });
  
  if (client) {
    client.release(true);
  }
});

pool.on('connect', (client) => {
  client.on('error', (err) => {
    console.error('Client error:', {
      error: err.message,
      processId: client.processID,
      environment: process.env.NODE_ENV
    });
    client.release(true);
  });
});

async function connectDB() {
  let retries = 2;
  let lastError;
  let delay = 100;
  
  while (retries > 0) {
    try {
      const client = await pool.connect();
      
      await client.query(`
        SET statement_timeout = '5s';
        SET idle_in_transaction_session_timeout = '5s';
        SET lock_timeout = '5s';
      `);
      
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      lastError = error;
      console.error('Database connection attempt failed:', {
        error: error.message,
        code: error.code,
        retries: retries - 1,
        delay
      });
      
      retries--;
      
      if (retries === 0) {
        console.error('All database connection attempts failed');
        return false;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay + 100, 500); // Linear backoff with shorter delays
    }
  }
  return false;
}

export { pool, connectDB }; 