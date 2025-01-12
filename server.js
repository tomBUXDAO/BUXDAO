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

const app = express();

// Basic middleware
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://buxdao.com', 'https://www.buxdao.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin']
}));

// Debug middleware for all requests
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  // Add response logging
  const oldSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Response ${res.statusCode} sent in ${duration}ms`);
    return oldSend.apply(res, arguments);
  };
  
  next();
});

// Create separate routers for API and static files
const apiRouter = express.Router();
const staticRouter = express.Router();

// API middleware - ensure proper handling of all API routes
apiRouter.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Printful API handling
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

apiRouter.get('/printful/products', async (req, res) => {
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

apiRouter.get('/printful/products/:id', async (req, res) => {
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

// Mount all API routes
apiRouter.use('/auth/check', authCheckRouter);
apiRouter.use('/auth/discord', discordAuthRouter);
apiRouter.use('/auth/discord/callback', discordCallbackRouter);
apiRouter.use('/auth/wallet', walletAuthRouter);
apiRouter.use('/auth/logout', logoutRouter);
apiRouter.use('/collections', collectionsRouter);
apiRouter.use('/celebcatz', celebcatzRouter);
apiRouter.use('/top-holders', topHoldersHandler);

// API error handling
apiRouter.use((err, req, res, next) => {
  console.error('[API] Error handler caught:', err);
  console.error('Stack trace:', err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code,
    path: req.path
  });
});

// Static file handling
staticRouter.use(express.static('dist', {
  index: false, // Disable automatic serving of index.html
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
}));

// SPA fallback for static routes
staticRouter.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Mount routers with path-based routing
app.use('/api', apiRouter);
app.use('/', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next('route');
  }
  staticRouter(req, res, next);
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, 'localhost', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the Express app
export default app;