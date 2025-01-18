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
import rolesRouter from './api/auth/roles.js';
import collectionsRouter from './api/collections/index.js';
import celebcatzRouter from './api/celebcatz/index.js';
import topHoldersHandler from './api/top-holders.js';
import tokenMetricsRouter from './api/token-metrics.js';
import userRouter from './api/user/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
  app.enable('trust proxy');
}

// CORS configuration - must be first
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add CORS preflight handler
app.options('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie']
}));

// Test database connection and create tables if needed
const initDatabase = async () => {
  let client;
  try {
    console.log('Testing database connection...');
    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    try {
      // Create user_roles table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_roles (
          discord_id VARCHAR(255) PRIMARY KEY,
          discord_name VARCHAR(255),
          wallet_address VARCHAR(255),
          fcked_catz_holder BOOLEAN DEFAULT false,
          money_monsters_holder BOOLEAN DEFAULT false,
          moneymonsters3d_holder BOOLEAN DEFAULT false,
          ai_bitbots_holder BOOLEAN DEFAULT false,
          celebcatz_holder BOOLEAN DEFAULT false,
          fcked_catz_whale BOOLEAN DEFAULT false,
          money_monsters_whale BOOLEAN DEFAULT false,
          moneymonsters3d_whale BOOLEAN DEFAULT false,
          ai_bitbots_whale BOOLEAN DEFAULT false,
          bux_beginner BOOLEAN DEFAULT false,
          bux_builder BOOLEAN DEFAULT false,
          bux_saver BOOLEAN DEFAULT false,
          bux_banker BOOLEAN DEFAULT false,
          buxdao_5 BOOLEAN DEFAULT false,
          roles JSONB DEFAULT '[]'::jsonb,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create roles table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('holder', 'whale', 'token', 'special')),
          collection VARCHAR(50) NOT NULL,
          threshold INTEGER DEFAULT 1,
          discord_role_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT roles_discord_role_id_key UNIQUE (discord_role_id)
        );

        -- Create index on discord_role_id for faster lookups
        CREATE INDEX IF NOT EXISTS idx_roles_discord_role_id ON roles(discord_role_id);
        -- Create index for filtering on type and collection
        CREATE INDEX IF NOT EXISTS idx_roles_type_collection ON roles(type, collection);
      `);

      // Create bux_holders table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS bux_holders (
          wallet_address VARCHAR(255) PRIMARY KEY,
          owner_discord_id VARCHAR(255) REFERENCES user_roles(discord_id),
          owner_name VARCHAR(255),
          balance DECIMAL(20,8) DEFAULT 0,
          unclaimed_rewards DECIMAL(20,8) DEFAULT 0,
          last_claim_time TIMESTAMP,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_exempt BOOLEAN DEFAULT false
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

      // Add roles column if it doesn't exist
      await client.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_roles' 
            AND column_name = 'roles'
          ) THEN
            ALTER TABLE user_roles ADD COLUMN roles JSONB DEFAULT '[]'::jsonb;
          END IF;
        END $$;
      `);

      // Commit transaction
      await client.query('COMMIT');
      console.log('Database initialized successfully');

    } catch (err) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw err;
    }

  } catch (err) {
    console.error('Database initialization failed:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    // If we can't initialize the database, we should exit
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
};

// Initialize database with retries
const initDatabaseWithRetry = async (maxRetries = 5, delay = 5000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await initDatabase();
      return; // Success, exit the retry loop
    } catch (err) {
      if (i === maxRetries - 1) {
        // Last attempt failed
        console.error('All database initialization attempts failed');
        process.exit(1);
      }
      console.log(`Database initialization attempt ${i + 1} failed, retrying in ${delay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Increase delay for next attempt
      delay *= 1.5;
    }
  }
};

// Initialize database with retry mechanism
initDatabaseWithRetry().catch(err => {
  console.error('Failed to initialize database:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
  process.exit(1);
});

// Parse cookies and JSON body - before session middleware
app.use(cookieParser());
app.use(express.json());

// Session configuration with PostgreSQL store
const pgSession = PostgresqlStore(session);

const sessionConfig = {
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: 60,
    errorLog: console.error
  }),
  name: 'buxdao.sid',
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: true,
  saveUninitialized: true,
  rolling: true,
  proxy: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined
  }
};

// Clean up duplicate sessions
app.use((req, res, next) => {
  const cookies = req.cookies;
  if (cookies && cookies['buxdao.sid']) {
    const sessionCookies = req.headers.cookie
      ?.split(';')
      .filter(c => c.trim().startsWith('buxdao.sid='));
    
    if (sessionCookies && sessionCookies.length > 1) {
      // Keep only the most recent session
      const validSession = sessionCookies[0].split('=')[1];
      res.cookie('buxdao.sid', validSession, {
        maxAge: sessionConfig.cookie.maxAge,
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/'
      });
    }
  }
  next();
});

// Initialize session middleware
app.use(session(sessionConfig));

// Add session debugging middleware
app.use((req, res, next) => {
  console.log('Session debug:', {
    url: req.url,
    method: req.method,
    sessionID: req.sessionID,
    hasSession: !!req.session,
    discordState: req.session?.discord_state,
    cookies: req.headers.cookie,
    secure: req.secure,
    protocol: req.protocol,
    'x-forwarded-proto': req.headers['x-forwarded-proto']
  });
  next();
});

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
      imgSrc: [
        "'self'", 
        "data:", 
        "cdn.discordapp.com", 
        "arweave.net", 
        "*.arweave.net",
        "gateway.pinata.cloud",
        "*.ipfs.nftstorage.link",
        "nftstorage.link"
      ],
      connectSrc: [
        "'self'", 
        "discord.com",
        "http://localhost:3001",
        "http://localhost:5173",
        process.env.NODE_ENV === 'development' ? "ws://localhost:5173" : null,
        process.env.NODE_ENV === 'production' ? "https://buxdao.com" : null,
        "api.mainnet-beta.solana.com",
        "solana-mainnet.g.alchemy.com",
        "rpc.ankr.com",
        "solana.getblock.io",
        "mainnet.helius-rpc.com"
      ].filter(Boolean),
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

// Authentication middleware
app.use('/api/user', (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = req.session.user;
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
app.use('/api/auth/roles', rolesRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/celebcatz', celebcatzRouter);
app.use('/api/top-holders', topHoldersHandler);
app.use('/api/token-metrics', tokenMetricsRouter);
app.use('/api/user', userRouter);

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