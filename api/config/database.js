import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Add event listeners for better monitoring and error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Attempt to reconnect
  client.release(true); // Force release with error
});

pool.on('connect', () => {
  console.log('New client connected to the pool');
});

pool.on('remove', () => {
  console.log('Client removed from pool');
});

// Export the pool instance
export default pool; 