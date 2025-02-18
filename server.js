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
      ? [
          'https://buxdao.com', 
          'https://www.buxdao.com', 
          'https://discord.com',
          /\.vercel\.app$/  // Allow all Vercel deployment URLs
        ]
      : ['http://localhost:5173', 'http://localhost:3001', 'https://discord.com'];
    
    // Allow requests with no origin (like mobile apps, curl, Discord interactions)
    if (!origin) {
      callback(null, true);
      return;
    }

    // Check if origin matches any of our patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return origin === allowed;
    });

    if (isAllowed) {
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

// Add CORS preflight handler with same configuration
app.options('*', cors({
  origin: function(origin, callback) {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [
          'https://buxdao.com', 
          'https://www.buxdao.com', 
          'https://discord.com',
          /\.vercel\.app$/  // Allow all Vercel deployment URLs
        ]
      : ['http://localhost:5173', 'http://localhost:3001', 'https://discord.com'];
    
    if (!origin) {
      callback(null, true);
      return;
    }

    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return origin === allowed;
    });

    if (isAllowed) {
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

// Add Discord interactions route before body parsing middleware
if (discordInteractions) {
  const discordRoute = express.Router();
  
  // Add raw body middleware
  discordRoute.use(rawBodyMiddleware());
  
  // Handle Discord interactions
  discordRoute.post('/', async (req, res) => {
    const { type, token } = req.body;

    // Handle verification requests immediately
    if (type === 1) {
      return res.json({ type: 1 }); // Return PONG
    }

    // For all other requests, acknowledge immediately
    res.json({
      type: 5, // DEFERRED_CHANNEL_MESSAGE
      data: {
        flags: 64 // Make response ephemeral
      }
    });

    // Process the interaction in the background
    try {
      // Ensure rawBody is available for verification
      if (!req.rawBody) {
        console.error('Raw body not available for Discord verification');
        await sendFollowupMessage(token, {
          content: 'Error: Invalid request',
          flags: 64
        });
        return;
      }

      // Set a timeout for the interaction processing
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command processing timed out')), 2000);
      });

      // Process the interaction with timeout
      await Promise.race([
        discordInteractions.default(req),
        timeoutPromise
      ]).then(async (response) => {
        if (response && response.data) {
          await sendFollowupMessage(token, response.data);
        }
      }).catch(async (err) => {
        console.error('Command processing error:', err);
        await sendFollowupMessage(token, {
          content: 'An error occurred while processing your command. Please try again.',
          flags: 64
        });
      });
    } catch (err) {
      console.error('Discord interaction error:', {
        message: err.message,
        stack: err.stack,
        type: err.type
      });
      
      try {
        await sendFollowupMessage(token, {
          content: 'An error occurred while processing your command. Please try again.',
          flags: 64
        });
      } catch (followupErr) {
        console.error('Failed to send error followup:', followupErr);
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

// Helper function to send followup messages with retry and backoff
async function sendFollowupMessage(token, data, retries = 3) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        }
      );

      const responseText = await response.text();
      
      if (!response.ok) {
        lastError = new Error(responseText);
        console.error(`Error sending followup (attempt ${i + 1}/${retries}):`, responseText);
        
        // If we're rate limited, wait the specified time
        if (response.status === 429) {
          const rateLimit = JSON.parse(responseText);
          await new Promise(resolve => setTimeout(resolve, (rateLimit.retry_after * 1000) + 100));
          continue;
        }
        
        // For invalid token, break immediately
        if (response.status === 401) {
          throw new Error('Invalid webhook token');
        }
        
        // For other errors, use exponential backoff
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        }
      }
      
      return;
    } catch (error) {
      lastError = error;
      console.error(`Failed to send followup (attempt ${i + 1}/${retries}):`, error);
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  
  throw lastError;
}

// Parse cookies before anything else
app.use(cookieParser());

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

// Improve database connection handling
const initDatabase = async () => {
  let retries = 5;
  let client;
  let lastError;

  while (retries > 0) {
    try {
      console.log(`Testing database connection (${retries} retries left)...`);
      client = await pool.connect();
      
      // Set shorter statement timeout
      await client.query('SET statement_timeout = 10000');
      
      // Test the connection with a simple query
      await client.query('SELECT 1');
      
      console.log('Database connection successful');
      return true;
    } catch (err) {
      lastError = err;
      console.error('Database connection attempt failed:', {
        message: err.message,
        code: err.code,
        retries: retries - 1
      });
      
      retries--;
      
      if (retries === 0) {
        console.error('All database connection attempts failed:', {
          message: lastError.message,
          code: lastError.code
        });
        return false;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, 5 - retries)));
    } finally {
      if (client) {
        try {
          await client.release();
        } catch (releaseErr) {
          console.error('Error releasing client:', releaseErr);
        }
      }
    }
  }
  return false;
};

// Initialize database with better error handling
initDatabase().then(success => {
  if (!success) {
    console.warn('Server starting with limited functionality due to database connection failure');
  }
}).catch(err => {
  console.error('Critical database initialization error:', err);
  console.warn('Server starting with limited functionality');
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;