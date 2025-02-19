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

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Enhanced logging for connection events
pool.on('connect', (client) => {
  console.log('Database client connected:', {
    processId: client.processID,
    database: client.database,
    user: client.user,
    host: client.host,
    port: client.port
  });
});

pool.on('error', (err, client) => {
  console.error('Database pool error:', {
    error: err.message,
    code: err.code,
    detail: err.detail,
    hint: err.hint,
    position: err.position,
    client: client?.processID
  });
});

pool.on('acquire', (client) => {
  console.log('Database client acquired from pool:', {
    processId: client.processID,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  });
});

async function connectDB() {
  let retries = 5;
  while (retries > 0) {
    try {
      console.log(`Attempting database connection (${retries} attempts remaining)...`);
      const client = await pool.connect();
      const result = await client.query('SELECT version(), current_database(), current_user');
      console.log('Database connection successful:', {
        version: result.rows[0].version,
        database: result.rows[0].current_database,
        user: result.rows[0].current_user,
        processId: client.processID
      });
      client.release();
      return true;
    } catch (error) {
      console.error('Database connection attempt failed:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        retries: retries - 1
      });
      retries--;
      if (retries === 0) {
        throw error;
      }
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, 5 - retries)));
    }
  }
  return false;
}

export { pool, connectDB }; 