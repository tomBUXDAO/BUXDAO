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

// Debug logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Printful API handlers
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

// Explicit route handlers for Printful API
app.get('/api/printful/products', async (req, res) => {
  console.log('[Printful] Starting products request...');
  
  if (!PRINTFUL_API_KEY) {
    console.error('[Printful] API key is missing');
    return res.status(500).json({ error: 'Printful API key is not configured' });
  }

  try {
    console.log('[Printful] Making request to Printful API...');
    const auth = Buffer.from(PRINTFUL_API_KEY + ':').toString('base64');
    
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('[Printful] Response received:', {
      status: response.status,
      contentType: response.headers['content-type']
    });

    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/printful/products/:id', async (req, res) => {
  if (!PRINTFUL_API_KEY) {
    return res.status(500).json({ error: 'Printful API key is not configured' });
  }

  try {
    const auth = Buffer.from(PRINTFUL_API_KEY + ':').toString('base64');
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products/${req.params.id}`,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Other API routes
app.use('/api/auth/check', authCheckRouter);
app.use('/api/auth/discord', discordAuthRouter);
app.use('/api/auth/discord/callback', discordCallbackRouter);
app.use('/api/auth/wallet', walletAuthRouter);
app.use('/api/auth/logout', logoutRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/celebcatz', celebcatzRouter);
app.use('/api/top-holders', topHoldersHandler);

// Static file serving
app.use(express.static('dist', {
  index: false
}));

// SPA fallback
app.get('*', (req, res) => {
  // Only serve index.html for non-API routes
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;