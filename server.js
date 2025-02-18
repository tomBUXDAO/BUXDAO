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
import balanceRouter from './api/user/balance.js';
import collectionCountsRouter from './api/collection-counts/index.js';
import processRewardsRouter from './api/rewards/process-daily.js';
import rewardsEventsRouter from './api/rewards/events.js';
import rawBodyMiddleware from './api/middleware/rawBody.js';
let discordInteractions;
try {
  discordInteractions = await import('./api/discord/interactions/index.js');
} catch (error) {
  console.error('Failed to load Discord interactions:', error);
  discordInteractions = null;
}

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
  origin: function(origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://buxdao.com', 'https://www.buxdao.com', 'https://discord.com']
      : ['http://localhost:5173', 'http://localhost:3001', 'https://discord.com'];
    
    // Allow requests with no origin (like mobile apps, curl, Discord interactions)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-Signature-Ed25519', 'X-Signature-Timestamp'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Add CORS preflight handler
app.options('*', cors({
  origin: function(origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? ['https://buxdao.com', 'https://www.buxdao.com', 'https://discord.com']
      : ['http://localhost:5173', 'http://localhost:3001', 'https://discord.com'];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'X-Signature-Ed25519', 'X-Signature-Timestamp'],
  exposedHeaders: ['Set-Cookie']
}));

// Test database connection and create tables if needed
const initDatabase = async () => {
  let retries = 5;
  let client;

  while (retries > 0) {
    try {
      console.log(`Testing database connection (${retries} retries left)...`);
      client = await pool.connect();
      
      // Set statement timeout to prevent long-running queries
      await client.query('SET statement_timeout = 30000');
      
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

      // Insert default roles if they don't exist
      await client.query(`
        INSERT INTO roles (name, type, collection, threshold, discord_role_id) VALUES
        -- Holder roles
        ('FCKed Catz Holder', 'holder', 'fcked_catz', 1, '1095033759612547133'),
        ('Money Monsters Holder', 'holder', 'money_monsters', 1, '1093607056696692828'),
        ('AI BitBots Holder', 'holder', 'ai_bitbots', 1, '1095034117877399686'),
        ('Money Monsters 3D Holder', 'holder', 'moneymonsters3d', 1, '1093607187454111825'),
        ('Celebrity Catz Holder', 'holder', 'celebcatz', 1, '1095335098112561234'),

        -- Whale roles
        ('FCKed Catz Whale', 'whale', 'fcked_catz', 25, '1095033566070583457'),
        ('Money Monsters Whale', 'whale', 'money_monsters', 25, '1093606438674382858'),
        ('AI BitBots Whale', 'whale', 'ai_bitbots', 10, '1095033899492573274'),
        ('Money Monsters 3D Whale', 'whale', 'moneymonsters3d', 25, '1093606579355525252'),

        -- BUX token roles
        ('BUX Beginner', 'token', 'bux', 2500, '1248416679504117861'),
        ('BUX Builder', 'token', 'bux', 10000, '1248417674476916809'),
        ('BUX Saver', 'token', 'bux', 25000, '1248417591215784019'),
        ('BUX Banker', 'token', 'bux', 50000, '1095363984581984357'),

        -- Special roles
        ('BUXDAO 5', 'special', 'all', 5, '1248428373487784006')
        ON CONFLICT ON CONSTRAINT roles_discord_role_id_key DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          collection = EXCLUDED.collection,
          threshold = EXCLUDED.threshold,
          updated_at = CURRENT_TIMESTAMP;
      `);

      console.log('Database initialized successfully');
      return;
    } catch (err) {
      console.error('Database initialization attempt failed:', {
        message: err.message,
        code: err.code,
        retries: retries - 1
      });
      
      retries--;
      if (retries === 0) {
        console.error('All database connection attempts failed');
        // Don't exit process, continue with limited functionality
        return;
      }
      
      // Wait 5 seconds before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    } finally {
      if (client) {
        await client.release();
      }
    }
  }
};

// Initialize database but don't exit on failure
initDatabase().catch(err => {
  console.error('Failed to initialize database:', {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
  // Continue running the server with limited functionality
});

// Parse cookies before anything else
app.use(cookieParser());

// Add Discord interactions route before body parsing middleware
if (discordInteractions) {
  const discordRoute = express.Router();
  discordRoute.use(rawBodyMiddleware());
  discordRoute.post('/', async (req, res, next) => {
    // Set a timeout for the response
    res.setTimeout(2900, () => {
      console.error('Discord interaction timed out');
      if (!res.headersSent) {
        res.json({
          type: 4,
          data: {
            content: 'The request timed out. Please try again.',
            flags: 64
          }
        });
      }
    });

    // Ensure rawBody is available for verification
    if (!req.rawBody) {
      console.error('Raw body not available for Discord verification');
      return res.status(401).json({
        type: 4,
        data: {
          content: 'Invalid request',
          flags: 64
        }
      });
    }

    try {
      await discordInteractions.default(req, res, next);
    } catch (err) {
      console.error('Discord interaction error:', err);
      if (!res.headersSent) {
        res.json({
          type: 4,
          data: {
            content: 'An error occurred while processing your command.',
            flags: 64
          }
        });
      }
    }
  });
  
  app.use('/api/discord-interactions', discordRoute);
} else {
  app.post('/api/discord-interactions', (req, res) => {
    console.error('Discord interactions module not loaded');
    res.json({
      type: 4,
      data: {
        content: 'Discord interactions are currently unavailable.',
        flags: 64
      }
    });
  });
}

// Body parsing middleware for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
        ...sessionConfig.cookie
      });
    }
  }
  next();
});

// Session middleware
app.use(session(sessionConfig));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "wss:", "https:", "http:"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Serve static files with proper MIME types
app.use(express.static('dist', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set proper MIME types
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    }

    // Set caching headers
    if (path.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
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

// Printful API configuration
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

// Printful API endpoints
app.get('/api/printful/products', async (req, res) => {
  try {
    if (!PRINTFUL_API_KEY) {
      console.error('Printful API key is not configured');
      return res.status(500).json({ error: 'Printful API key is not configured' });
    }

    console.log('Fetching products from Printful API...');
    const response = await axios.get(`${PRINTFUL_API_URL}/store/products`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`
      }
    });

    console.log('Successfully fetched products from Printful');
    res.json(response.data.result);
  } catch (error) {
    console.error('Error fetching products from Printful:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Error fetching products from Printful',
      details: error.message 
    });
  }
});

app.get('/api/printful/products/:id', async (req, res) => {
  try {
    if (!PRINTFUL_API_KEY) {
      console.error('Printful API key is not configured');
      return res.status(500).json({ error: 'Printful API key is not configured' });
    }

    const { id } = req.params;
    console.log(`Fetching product ${id} from Printful API...`);
    
    const response = await axios.get(`${PRINTFUL_API_URL}/store/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`
      }
    });

    console.log(`Successfully fetched product ${id} from Printful`);
    res.json(response.data.result);
  } catch (error) {
    console.error(`Error fetching product ${req.params.id} from Printful:`, error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Error fetching product from Printful',
      details: error.message 
    });
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
app.use('/api/user/balance', balanceRouter);
app.use('/api/collection-counts', collectionCountsRouter);

// Mount rewards routes
const rewardsRouter = express.Router();
rewardsRouter.use('/process-daily', processRewardsRouter);
rewardsRouter.use('/events', rewardsEventsRouter);
app.use('/api/rewards', rewardsRouter);

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

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