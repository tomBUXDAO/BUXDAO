import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  try {
    const result = await pool.query(`
      SELECT image_url, name 
      FROM nft_metadata 
      WHERE symbol = 'CelebCatz'
      AND name LIKE 'Celebrity Catz #%'
      AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
      ORDER BY name
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Database query failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  }
} 