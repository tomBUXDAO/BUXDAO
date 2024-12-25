import { Pool } from 'pg';

export default async function handler(req, res) {
  console.log('CelebCatz images endpoint hit');
  console.log('Database URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    // Create a new client for this request
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      },
      // Add connection timeout
      connectionTimeoutMillis: 5000,
      // Add query timeout
      statement_timeout: 10000
    });

    // Get a client from the pool
    client = await pool.connect();
    console.log('Database connection acquired');

    // Execute the query with the client
    console.log('Executing query...');
    const result = await client.query(`
      SELECT image_url, name 
      FROM nft_metadata 
      WHERE symbol = 'CelebCatz'
      AND name LIKE 'Celebrity Catz #%'
      AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
      ORDER BY name
    `);
    
    console.log('Query completed. Row count:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('No images found');
      return res.json([]);
    }
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Database error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      connectionString: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 20) + '...' : 'Not set'
    });
    res.status(500).json({ 
      error: 'Failed to fetch images', 
      details: error.message,
      code: error.code 
    });
  } finally {
    // Release the client back to the pool
    if (client) {
      try {
        console.log('Releasing database connection');
        await client.release();
      } catch (err) {
        console.error('Error releasing client:', err);
      }
    }
  }
} 