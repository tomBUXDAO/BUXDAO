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
import rewardsHandler from './rewards/process-daily.js';
import { pool, healthCheck } from './config/database.js';

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



  // Handle health check endpoint
  if (req.url === '/api/health' && req.method === 'GET') {
    try {
      const dbHealthy = await healthCheck();
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: dbHealthy ? 'connected' : 'disconnected',
        environment: process.env.NODE_ENV
      });
    } catch (error) {
      console.error('Health check failed:', error);
      return res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'error',
        error: error.message
      });
    }
  }

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

  // Handle rewards endpoints
  if (req.url.startsWith('/api/rewards/')) {
    // Adjust req.url to be relative to the rewards handler
    req.url = req.url.substring('/api/rewards'.length);
    return rewardsHandler(req, res);
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