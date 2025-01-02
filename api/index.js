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
        console.error('Database query failed:', error.message);
        return res.status(500).json({ error: 'Failed to fetch images', details: error.message });
      }
    }
  }
  
  return res.status(404).json({ error: 'Not found' });
} 