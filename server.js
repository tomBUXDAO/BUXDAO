import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import PostgresqlStore from 'connect-pg-simple';
import pool from './config/database.js';
import helmet from 'helmet';

// Import routers
import authCheckRouter from './api/auth/check.js';
import discordAuthRouter from './api/auth/discord.js';
import discordCallbackRouter from './api/auth/discord/callback.js';
import walletAuthRouter from './api/auth/wallet.js';
import logoutRouter from './api/auth/logout.js';
import collectionsRouter from './api/collections/index.js';
import celebcatzRouter from './api/celebcatz/index.js';
import topHoldersHandler from './api/top-holders.js';
import tokenMetricsRouter from './api/token-metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// CORS configuration - must be first
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://buxdao.com', 'https://www.buxdao.com'] 
    : ['http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Accept']
}));

// Test database connection and create tables if needed
const initDatabase = async () => {
  let client;
  try {
    console.log('Testing database connection...');
    client = await pool.connect();
    
    // Create user_roles table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        discord_id VARCHAR(255) PRIMARY KEY,
        discord_name VARCHAR(255) NOT NULL,
        wallet_address VARCHAR(255),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        roles JSONB DEFAULT '[]'::jsonb
      );
    `);

    // Create session table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Database initialization failed:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    process.exit(1);
  } finally {
    if (client) {
      await client.release();
    }
  }
};

// Initialize database
initDatabase().catch(err => {
  console.error('Failed to initialize database:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
  process.exit(1);
});

// Session configuration with PostgreSQL store
const pgSession = PostgresqlStore(session);

app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  name: 'buxdao.sid',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  rolling: true,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  }
}));

// Add session debugging middleware
app.use((req, res, next) => {
  console.log('Session debug:', {
    url: req.url,
    method: req.method,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    discordState: req.session?.discord_state,
    cookies: req.headers.cookie
  });
  next();
});

// Parse cookies and JSON body
app.use(cookieParser());
app.use(express.json());

// Debug logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Session Info:`, {
    sessionID: req.sessionID,
    hasSession: !!req.session,
    discordState: req.session?.discord_state,
    cookies: req.headers.cookie
  });
  next();
});

// Add security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "cdn.discordapp.com", "*.arweave.net", "*.ipfs.nftstorage.link"],
      connectSrc: ["'self'", "discord.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"]
    }
  }
}));

// API middleware - only for /api routes
app.use('/api', (req, res, next) => {
  res.set('Content-Type', 'application/json');
  res.set('Cache-Control', 'no-store');
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

// API routes
app.use('/api/auth/check', authCheckRouter);
app.use('/api/auth/discord', discordAuthRouter);
app.use('/api/auth/discord/callback', discordCallbackRouter);
app.use('/api/auth/wallet', walletAuthRouter);
app.use('/api/auth/logout', logoutRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/celebcatz', celebcatzRouter);
app.use('/api/top-holders', topHoldersHandler);
app.use('/api/token-metrics', tokenMetricsRouter);

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// Handle client-side routing in development mode
app.get('*', (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    // In development, proxy to Vite dev server
    res.redirect(`http://localhost:5173${req.url}`);
  } else {
    // In production, serve the index.html
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;