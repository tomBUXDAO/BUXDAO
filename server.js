import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// Database setup with more logging
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection immediately
console.log('Attempting database connection...');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Connection string:', process.env.POSTGRES_URL.substring(0, 20) + '...');
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
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

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit');
  res.json({ message: 'API is working' });
});

// Add a test query to check the table structure
app.get('/api/test/db', async (req, res) => {
  try {
    // Check if table exists
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Available tables:', tables.rows);

    // If nft_metadata exists, check its structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'nft_metadata'
    `);
    console.log('Table structure:', columns.rows);

    // Check sample data
    const sample = await pool.query(`
      SELECT * FROM nft_metadata LIMIT 1
    `);
    console.log('Sample data:', sample.rows[0]);

    res.json({
      tables: tables.rows,
      columns: columns.rows,
      sample: sample.rows[0]
    });
  } catch (error) {
    console.error('Database test failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
console.log('Starting server...');
console.log('Environment variables loaded:', {
  POSTGRES_URL: process.env.POSTGRES_URL ? 'Set' : 'Not set',
  PORT: process.env.PORT || 3001
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- GET /api/test');
  console.log('- GET /api/celebcatz/images');
  console.log('- GET /api/collections/:symbol/stats');
  console.log('=================================');
}); 