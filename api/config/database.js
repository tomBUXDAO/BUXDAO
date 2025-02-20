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
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 1000,
  application_name: 'buxdao_auth',
  statement_timeout: 30000,
  query_timeout: 30000,
  idle_in_transaction_session_timeout: 30000
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
  let retries = 5;
  let lastError;
  
  while (retries > 0) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('Database connection successful');
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  if (lastError) {
    console.error('All database connection attempts failed:', lastError);
  }
  return false;
}

export { pool, connectDB }; 