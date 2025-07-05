import pkg from 'pg';
const { Pool } = pkg;
import axios from 'axios';
import dotenv from 'dotenv';
const printfulOrderRouter = require('./printful/order');
const merchOrdersRouter = require('./merch/orders');

dotenv.config();

import authHandler from './auth/index.js';
import collectionCountsHandler from './collection-counts/index.js';
import nftLookupHandler from './nft-lookup.js';
import userHandler from './user/index.js';

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

  // Handle NFT lookup endpoint
  if (req.url === '/api/nft-lookup' && req.method === 'POST') {
    return nftLookupHandler(req, res);
  }

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

  // Handle user endpoints
  if (req.url.startsWith('/api/user/')) {
    // Adjust req.url to be relative to the user handler if needed
    req.url = req.url.substring('/api/user'.length);
    return userHandler(req, res);
  }

  if (req.method === 'GET') {
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

app.use('/api/printful', printfulOrderRouter);
app.use('/api/merch', merchOrdersRouter); 