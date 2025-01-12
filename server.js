import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import express from 'express';
import cors from 'cors';
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

// Debug middleware for API requests
app.use('/api', (req, res, next) => {
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

// Mount API routes
app.use('/api/auth/check', authCheckRouter);
app.use('/api/auth/discord', discordAuthRouter);
app.use('/api/auth/discord/callback', discordCallbackRouter);
app.use('/api/auth/wallet', walletAuthRouter);
app.use('/api/auth/logout', logoutRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/celebcatz', celebcatzRouter);
app.use('/api/top-holders', topHoldersHandler);

// API error handling
app.use('/api', (err, req, res, next) => {
  console.error('[API] Error handler caught:', err);
  console.error('Stack trace:', err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code,
    path: req.path
  });
});

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Static file handling - after API routes
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

// SPA fallback - must be last and only for non-API routes
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