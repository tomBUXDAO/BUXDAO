import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const poolConfig = {
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  // Optimize connection pool settings
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500, // Close and replace a connection after it has been used 7500 times
  keepAlive: true, // Keep connections alive
  keepAliveInitialDelayMillis: 10000, // Start keep-alive after 10 seconds
  allowExitOnIdle: true // Allow the process to exit even if there are idle connections
};

const pool = new pg.Pool(poolConfig);

// Add connection error handling with more detailed logging
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
  // Force release the client back to the pool with an error
  if (client) {
    client.release(true);
  }
});

// Add connection success logging
pool.on('connect', (client) => {
  console.log('PostgreSQL connected successfully', {
    database: client.database,
    host: client.host,
    port: client.port,
    ssl: !!client.ssl
  });
});

// Add connection removal logging
pool.on('remove', () => {
  console.log('Client removed from pool');
});

export default pool; 