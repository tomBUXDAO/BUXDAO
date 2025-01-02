import { Pool } from 'pg';
import axios from 'axios';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    // Handle collection stats endpoint
    if (req.url.startsWith('/api/collections/') && req.url.endsWith('/stats')) {
      const symbol = req.url.split('/')[3];
      try {
        const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
        return res.json(response.data);
      } catch (error) {
        console.error(`Error fetching stats for ${symbol}:`, error.message);
        return res.status(500).json({ error: 'Failed to fetch stats' });
      }
    }
    
    // Handle celebcatz images endpoint
    if (req.url === '/api/celebcatz/images') {
      try {
        const result = await pool.query(`
          SELECT image_url, name 
          FROM nft_metadata 
          WHERE symbol = 'CelebCatz'
          AND name LIKE 'Celebrity Catz #%'
          AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
          ORDER BY name
        `);
        
        return res.json(result.rows);
      } catch (error) {
        console.error('Database query failed:', error);
        if (error.code) console.error('Error code:', error.code);
        return res.status(500).json({ 
          error: 'Failed to fetch images', 
          details: error.message,
          code: error.code 
        });
      }
    }
  }
  
  return res.status(404).json({ error: 'Not found' });
} 