import { Pool } from 'pg';

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 1, // Limit connections for serverless
      connectionTimeoutMillis: 5000
    });
  }
  return pool;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = await getPool().connect();
  
  try {
    const result = await client.query(`
      SELECT image_url, name 
      FROM nft_metadata 
      WHERE symbol = 'CelebCatz'
      AND name LIKE 'Celebrity Catz #%'
      AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
      ORDER BY name
    `);
    
    if (result.rows.length === 0) {
      return res.json([]);
    }
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Database query failed:', error);
    res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  } finally {
    client.release();
  }
} 