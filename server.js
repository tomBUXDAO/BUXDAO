import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import NodeCache from 'node-cache';
import cookieParser from 'cookie-parser';
import client from './config/database.js';
import authCheckRouter from './api/auth/check.js';
import discordAuthRouter from './api/auth/discord.js';
import discordCallbackRouter from './api/auth/discord/callback.js';
import walletAuthRouter from './api/auth/wallet.js';
import logoutRouter from './api/auth/logout.js';
import collectionsRouter from './api/collections/index.js';
import celebcatzRouter from './api/celebcatz/index.js';
import topHoldersHandler from './api/top-holders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create separate apps for API and static files
const app = express();
const apiApp = express();

// Basic middleware for both apps
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
apiApp.use(express.json());
apiApp.use(cookieParser(process.env.COOKIE_SECRET));

// CORS configuration for both apps
const corsOptions = {
  origin: ['http://localhost:5173', 'https://buxdao.com', 'https://www.buxdao.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin']
};
app.use(cors(corsOptions));
apiApp.use(cors(corsOptions));

// Debug middleware for API app
apiApp.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`[API ${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  // Add response logging
  const oldSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[API ${new Date().toISOString()}] Response ${res.statusCode} sent in ${duration}ms`);
    return oldSend.apply(res, arguments);
  };
  
  // Set API-specific headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Printful API routes
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

apiApp.get('/printful/products', async (req, res) => {
  if (!PRINTFUL_API_KEY) {
    console.error('[Printful] API key not configured');
    return res.status(500).json({ error: 'Printful API key not configured' });
  }

  try {
    console.log('[Printful] Fetching products...');
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.result) {
      console.error('[Printful] Invalid response format:', response.data);
      return res.status(500).json({ error: 'Invalid response from Printful API' });
    }

    console.log('[Printful] Successfully fetched products');
    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch products',
      details: error.response?.data || error.message
    });
  }
});

apiApp.get('/printful/products/:id', async (req, res) => {
  if (!PRINTFUL_API_KEY) {
    console.error('[Printful] API key not configured');
    return res.status(500).json({ error: 'Printful API key not configured' });
  }

  const productId = req.params.id;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    console.log(`[Printful] Fetching product details for ID: ${productId}`);
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products/${productId}`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.result) {
      console.error('[Printful] Invalid response format:', response.data);
      return res.status(500).json({ error: 'Invalid response from Printful API' });
    }

    console.log('[Printful] Successfully fetched product details');
    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch product details',
      details: error.response?.data || error.message
    });
  }
});

// Mount other API routes
apiApp.use('/auth/check', authCheckRouter);
apiApp.use('/auth/discord', discordAuthRouter);
apiApp.use('/auth/discord/callback', discordCallbackRouter);
apiApp.use('/auth/wallet', walletAuthRouter);
apiApp.use('/auth/logout', logoutRouter);
apiApp.use('/collections', collectionsRouter);
apiApp.use('/celebcatz', celebcatzRouter);
apiApp.use('/top-holders', topHoldersHandler);

// API error handling
apiApp.use((err, req, res, next) => {
  console.error('[API] Error handler caught:', err);
  console.error('Stack trace:', err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code,
    path: req.path
  });
});

// Mount API app at /api
app.use('/api', apiApp);

// Static file handling - completely separate from API
app.use(express.static('dist', {
  index: false, // Disable automatic serving of index.html
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// SPA fallback - only for non-API routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, 'localhost', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the Express app
export default app;