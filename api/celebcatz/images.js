import pkg from 'pg';
const { Pool } = pkg;

// Database setup
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  try {
    console.log('Fetching CelebCatz images...');
    const result = await pool.query(`
      SELECT image_url, name 
      FROM nft_metadata 
      WHERE symbol = 'CelebCatz'
      AND name LIKE 'Celebrity Catz #%'
      AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
      ORDER BY name
    `);
    
    console.log(`Found ${result.rows.length} images`);
    
    if (result.rows.length === 0) {
      console.log('No images found');
      return res.status(200).json([]);
    }
    
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('Database query failed:', error.message);
    return res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  }
} 