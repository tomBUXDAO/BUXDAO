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
  max: 1, // Single connection for serverless
  min: 0, // Allow pool to empty
  idleTimeoutMillis: 30000, // 30 second idle timeout
  connectionTimeoutMillis: 10000, // 10 second connection timeout
  maxUses: 10, // Recycle connection after 10 uses
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 1000,
  application_name: 'buxdao_auth',
  statement_timeout: 10000,
  query_timeout: 10000,
  idle_in_transaction_session_timeout: 10000
};

const pool = new pkg.Pool(poolConfig);

// Simplified connection cleanup
setInterval(() => {
  pool.on('acquire', (client) => {
    if (client) client.release(true);
  });
}, 30000);

// Basic error handling
pool.on('error', (err, client) => {
  if (client) client.release(true);
});

async function connectDB() {
  let retries = 3;
  let delay = 1000;
  
  while (retries > 0) {
    try {
      const client = await pool.connect();
      client.release();
      return true;
    } catch (error) {
      retries--;
      if (retries === 0) return false;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay += 1000;
    }
  }
  return false;
}

export { pool, connectDB }; 