import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  console.log('CelebCatz images endpoint hit');
  console.log('Database URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Attempting database query...');
    const result = await pool.query(`
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
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Failed to fetch images', 
      details: error.message,
      code: error.code 
    });
  }
} 