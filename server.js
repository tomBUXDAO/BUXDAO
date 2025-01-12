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
import tokenMetricsRouter from './api/token-metrics.js';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic middleware
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Session middleware
app.use(session({
  secret: process.env.COOKIE_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined
  },
  name: 'buxdao.sid' // Custom session cookie name
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://buxdao.com', 'https://www.buxdao.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin', 'Cookie']
}));

// API middleware - only for /api routes
app.use('/api', (req, res, next) => {
  res.set('Content-Type', 'application/json');
  res.set('Cache-Control', 'no-store');
  next();
});

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
    
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products`,
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
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
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products/${req.params.id}`,
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
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
app.use('/api/token-metrics', tokenMetricsRouter);

// API 404 handler - must come after API routes but before static files
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Static file serving - after API routes
const staticHandler = express.static('dist', {
  index: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.set('Content-Type', 'text/css');
    }
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  staticHandler(req, res, next);
});

// SPA fallback - only for non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;