import express from 'express';
import cors from 'cors';
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;
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

// Database setup
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Stats endpoint
app.get('/api/collections/:symbol/stats', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching stats for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Add celebcatz images endpoint with more detailed error handling
app.get('/api/celebcatz/images', async (req, res) => {
  console.log('Endpoint hit: /api/celebcatz/images');
  try {
    const result = await pool.query(`
      SELECT image_url, name 
      FROM nft_metadata 
      WHERE symbol = 'CelebCatz'
      AND name LIKE 'Celebrity Catz #%'
      AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
      ORDER BY name
    `);
    
    console.log('Query result rows:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('No images found');
      return res.json([]);
    }
    
    console.log(`Found ${result.rows.length} images`);
    res.json(result.rows);
  } catch (error) {
    console.error('Database query failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch images', details: error.message });
  }
});

// Start the server when this file is run directly
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the Express app
export default app; 