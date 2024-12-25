import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  console.log('Database URL:', process.env.POSTGRES_URL);
  
  try {
    const result = await pool.query(`
      SELECT image_url, name 
      FROM nft_metadata 
      WHERE symbol = 'celebcatz' 
      AND CAST(SUBSTRING(name FROM '#([0-9]+)') AS INTEGER) <= 79
      ORDER BY RANDOM()
      LIMIT 20
    `);
    
    console.log('Query result:', result.rows);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Database error:', error.message);
    console.error('Full error:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
} 