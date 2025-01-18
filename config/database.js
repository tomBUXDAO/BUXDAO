import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const dbConfig = {
  development: {
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  },
  production: {
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  }
};

const pool = new pg.Pool(dbConfig[process.env.NODE_ENV || 'development']);

// Add connection error handling with more detailed logging
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
});

// Add connection success logging with connection details
pool.on('connect', (client) => {
  console.log('PostgreSQL connected successfully', {
    database: client.database,
    host: client.host,
    port: client.port,
    ssl: !!client.ssl
  });
});

export default pool; 