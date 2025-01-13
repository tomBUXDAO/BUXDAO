import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add event listeners for pool errors
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Export the pool instance
export default pool; 