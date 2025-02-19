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

// Configure pool based on environment
const poolConfig = {
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 1, // Single connection for serverless
  idleTimeoutMillis: 500, // Very short idle timeout
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 1000,
  allowExitOnIdle: true,
  application_name: 'buxdao_auth',
  statement_timeout: 5000, // 5 second query timeout
  query_timeout: 5000, // 5 second query timeout
  idle_in_transaction_session_timeout: 5000 // 5 second transaction timeout
};

const pool = new pkg.Pool(poolConfig);

// Enhanced logging for connection events
pool.on('connect', (client) => {
  console.log('Database client connected:', {
    processId: client.processID,
    database: client.database,
    user: client.user,
    host: client.host,
    port: client.port,
    poolSize: pool.totalCount,
    environment: process.env.NODE_ENV
  });
});

pool.on('error', (err, client) => {
  console.error('Database pool error:', {
    error: err.message,
    code: err.code,
    detail: err.detail,
    hint: err.hint,
    position: err.position,
    client: client?.processID,
    environment: process.env.NODE_ENV
  });
});

pool.on('acquire', (client) => {
  console.log('Database client acquired from pool:', {
    processId: client.processID,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    environment: process.env.NODE_ENV
  });
});

async function connectDB() {
  let retries = 3; // Reduce retries
  let lastError;
  let delay = 500; // Start with shorter delay
  
  while (retries > 0) {
    try {
      console.log(`Attempting database connection (${retries} attempts remaining)...`);
      const client = await pool.connect();
      
      // Set session parameters for better timeout handling
      await client.query(`
        SET statement_timeout = '5s';
        SET idle_in_transaction_session_timeout = '5s';
      `);
      
      // Test the connection
      await client.query('SELECT 1');
      
      console.log('Database connection successful:', {
        poolSize: pool.totalCount,
        environment: process.env.NODE_ENV,
        retries: 3 - retries
      });
      
      client.release();
      return true;
    } catch (error) {
      lastError = error;
      console.error('Database connection attempt failed:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        retries: retries - 1,
        delay: delay
      });
      
      retries--;
      
      if (retries === 0) {
        console.error('All database connection attempts failed:', {
          error: lastError.message,
          code: lastError.code,
          environment: process.env.NODE_ENV
        });
        return false;
      }
      
      // Linear backoff with shorter delays
      delay = Math.min(delay + 500, 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

export { pool, connectDB }; 