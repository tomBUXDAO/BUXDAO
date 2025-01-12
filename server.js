import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
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

// Debug middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
  console.log('[DEBUG] Headers:', req.headers);
  next();
});

// Create API router
const apiRouter = express.Router();

// API middleware
apiRouter.use((req, res, next) => {
  console.log(`[API] Processing API request: ${req.method} ${req.path}`);
  const startTime = Date.now();
  
  // Add response logging
  const oldSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[API] Response sent in ${duration}ms:`, {
      statusCode: res.statusCode,
      contentType: res.get('Content-Type'),
      dataLength: data?.length
    });
    return oldSend.apply(res, arguments);
  };
  
  // Set API-specific headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Printful API handlers
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

apiRouter.get('/printful/products', async (req, res) => {
  try {
    console.log('[Printful] Fetching products...');
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status === 200
    });

    console.log('[Printful] Successfully fetched products');
    res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

apiRouter.get('/printful/products/:id', async (req, res) => {
  try {
    console.log(`[Printful] Fetching product details for ID: ${req.params.id}`);
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products/${req.params.id}`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status === 200
    });

    console.log('[Printful] Successfully fetched product details');
    res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Mount other API routes
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

// Mount API router before static files
app.use('/api', apiRouter);

// Static file handling - after API routes
app.use((req, res, next) => {
  // Skip static file handling for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  express.static('dist', {
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith('.js')) {
        res.set('Content-Type', 'application/javascript');
      } else if (path.endsWith('.css')) {
        res.set('Content-Type', 'text/css');
      }
    }
  })(req, res, next);
});

// SPA fallback - must be last
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
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