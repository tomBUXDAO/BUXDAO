import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://buxdao-3-0.vercel.app',
    'https://buxdao.com',
    'https://www.buxdao.com'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
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
      console.log('Endpoint hit: /api/celebcatz/images');
      try {
        // Simpler query with fewer operations
        const result = await pool.query(
          'SELECT image_url, name FROM nft_metadata WHERE symbol = $1 AND name LIKE $2 AND name ~ $3 ORDER BY name',
          ['CelebCatz', 'Celebrity Catz #%', '^Celebrity Catz #[0-7][0-9]$']
        );
        
        console.log(`Query completed. Found ${result.rows.length} images`);
        return res.json(result.rows);
      } catch (error) {
        console.error('Database query failed:', error);
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