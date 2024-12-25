import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
app.use(express.static(path.join(__dirname, 'public')));

// Printful API configuration
const PRINTFUL_API_URL = 'https://api.printful.com';
const printfulAxios = axios.create({
  baseURL: PRINTFUL_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Database setup
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
console.log('Attempting database connection...');
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('Connection string:', process.env.POSTGRES_URL.substring(0, 20) + '...');
  } else {
    console.log('Database connected successfully at:', res.rows[0].now);
  }
});

// Printful API endpoints
app.get('/api/printful/products', async (req, res) => {
  try {
    const response = await fetch('https://api.printful.com/store/products', {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`
      }
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Printful API response:', data);

    if (!data.result) {
      throw new Error('Invalid response format from Printful API');
    }

    // Transform the data to match our frontend needs
    const products = data.result.map(item => ({
      id: item.id,
      name: item.name,
      thumbnail_url: item.thumbnail_url,
      variants: item.variants || 0,
      sync_product: item.sync_product,
      sync_variants: item.sync_variants
    }));

    res.json(products);
  } catch (error) {
    console.error('Error fetching from Printful:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/printful/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await printfulAxios.get(`/store/products/${id}`);
    res.json(response.data.result);
  } catch (error) {
    console.error('Error fetching Printful product:', error.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

app.post('/api/printful/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const response = await printfulAxios.post('/orders', orderData);
    res.json(response.data.result);
  } catch (error) {
    console.error('Error creating Printful order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
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
  PRINTFUL_API_KEY: process.env.PRINTFUL_API_KEY ? 'Set' : 'Not set',
  PORT: process.env.PORT || 3001
});

app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Server running on port ${PORT}`);
  console.log('Available routes:');
  console.log('- GET /api/printful/products');
  console.log('- GET /api/printful/products/:id');
  console.log('- POST /api/printful/orders');
  console.log('- GET /api/collections/:symbol/stats');
  console.log('=================================');
}); 