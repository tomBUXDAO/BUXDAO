import pkg from 'pg';
const { Pool } = pkg;
import axios from 'axios';
import authHandler from './auth/index.js';
import collectionCountsHandler from './collection-counts/[discord_id].js';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  // Set CORS headers
  const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://buxdao.com' : 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Log request details
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database URL exists:', !!process.env.POSTGRES_URL);

  // Handle auth endpoints
  if (req.url.startsWith('/api/auth/')) {
    return authHandler(req, res);
  }

  // Handle collection-counts endpoint
  if (req.url.startsWith('/api/collection-counts/')) {
    const discordId = req.url.split('/')[3];
    if (!discordId) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    req.params = { discord_id: discordId };
    return collectionCountsHandler(req, res);
  }

  if (req.method === 'GET') {
    // Handle collection stats endpoint
    if (req.url.startsWith('/api/collections/') && req.url.endsWith('/stats')) {
      const symbol = req.url.split('/')[3];
      try {
        console.log('Fetching stats for:', symbol);
        const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
        console.log('Stats response:', response.data);
        return res.status(200).json(response.data);
      } catch (error) {
        console.error('Error fetching stats:', {
          symbol,
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        return res.status(500).json({ 
          error: 'Failed to fetch stats',
          details: error.message,
          status: error.response?.status
        });
      }
    }
    
    // Handle celebcatz images endpoint
    if (req.url === '/api/celebcatz/images') {
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
        
        console.log('Found images:', result.rows.length);
        return res.status(200).json(result.rows);
      } catch (error) {
        console.error('Database error:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        return res.status(500).json({ 
          error: 'Failed to fetch images', 
          details: error.message,
          code: error.code
        });
      }
    }
  }
  
  // Handle 404 for unmatched routes
  return res.status(404).json({ error: 'API endpoint not found' });
} 