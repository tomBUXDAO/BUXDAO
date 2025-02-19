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
  ssl: { rejectUnauthorized: false },
  max: 1,
  min: 0,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 5000,
  maxUses: 5,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 1000,
  application_name: 'buxdao_auth',
  statement_timeout: 5000,
  query_timeout: 5000,
  idle_in_transaction_session_timeout: 5000
};

const pool = new pkg.Pool(poolConfig);

// Simplified error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  if (client) {
    client.release(true);
  }
});

async function connectDB() {
  let retries = 2;
  let lastError;
  
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      return true;
    } catch (error) {
      lastError = error;
      console.error('Database connection attempt failed:', {
        message: error.message,
        code: error.code,
        retries: retries - 1
      });
      retries--;
      if (retries === 0) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  if (lastError) {
    console.error('All database connection attempts failed:', lastError);
  }
  return false;
}

export { pool, connectDB }; 