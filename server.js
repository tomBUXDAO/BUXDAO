// Load environment variables first, before any other imports
if (process.env.NODE_ENV !== 'production') {
  const { fileURLToPath } = await import('url');
  const { dirname, resolve } = await import('path');
  const { default: dotenv } = await import('dotenv');
  const { default: fs } = await import('fs');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  // Try multiple possible .env file locations in development
  const envPaths = [
    resolve(__dirname, '.env'),
    resolve(__dirname, '../.env'),
    resolve(process.cwd(), '.env')
  ];

  let envLoaded = false;

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log('Found .env file at:', envPath);
      const result = dotenv.config({ path: envPath });
      
      if (!result.error) {
        envLoaded = true;
        console.log('Successfully loaded environment from:', envPath);
        break;
      } else {
        console.error('Error loading .env file from', envPath, ':', result.error);
      }
    } else {
      console.log('No .env file found at:', envPath);
    }
  }

  if (!envLoaded && process.env.NODE_ENV !== 'production') {
    console.error('Failed to load .env file from any of these locations:', envPaths);
    throw new Error('Could not load environment variables. Please ensure .env file exists and is accessible.');
  }
}

console.log('Environment check:', {
  nodeEnv: process.env.NODE_ENV,
  postgresUrl: process.env.POSTGRES_URL ? '[REDACTED]' : undefined,
  envKeys: Object.keys(process.env).filter(key => !key.includes('SECRET'))
});

// Only proceed with other imports after environment is loaded
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import path from 'path';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import PostgresqlStore from 'connect-pg-simple';
import helmet from 'helmet';
import { verifyKey } from 'discord-interactions';

// Database import after environment is loaded
import { pool } from './api/config/database.js';
import { handleNFTLookup } from './api/discord/interactions/commands/nft-lookup.js';

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
import nftLookupRouter from './api/nft-lookup.js';
import webhookRouter from './api/discord/webhook.js';

// Import monitor router with debug logging
console.log('Importing monitor router...');
import monitorRouter from './api/routes/monitor.js';
console.log('Monitor router imported successfully');

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

// Add request logging middleware
app.use((req, res, next) => {
  // Skip logging for Discord interaction requests as they'll be handled by the Edge Function
  if (req.path === '/api/discord-interactions') {
    return next();
  }
  
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    path: req.path,
    headers: req.headers
  });
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Add detailed request logging
app.use((req, res, next) => {
  console.log('Request details:', {
    method: req.method,
    originalUrl: req.originalUrl,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  next();
});

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
  resave: false,
  saveUninitialized: false,
  rolling: true,
  proxy: true,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : 'localhost'
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

// API middleware - only for /api routes
app.use('/api', (req, res, next) => {
  res.set('Content-Type', 'application/json');
  res.set('Cache-Control', 'no-store');
  next();
});

// Authentication middleware
app.use('/api/user', (req, res, next) => {
  // Check session first
  if (req.session?.user?.discord_id) {
    req.user = req.session.user;
    return next();
  }

  // Fallback to cookies if session is not available
  const cookies = req.cookies;
  if (cookies?.discord_user) {
    try {
      const userInfo = JSON.parse(cookies.discord_user);
      if (userInfo?.discord_id) {
        // Set session data from cookies
        req.session.user = userInfo;
        req.session.token = cookies.discord_token;
        req.user = userInfo;
        return next();
      }
    } catch (e) {
      console.error('Error parsing discord_user cookie:', e);
    }
  }

  return res.status(401).json({ error: 'Not authenticated' });
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

// Mount all API routes
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
app.use('/api/nft-lookup', nftLookupRouter);
app.use('/api/discord/webhook', webhookRouter);

// Mount monitor routes with more detailed logging
console.log('Mounting monitor routes...');
app.use('/api/monitor', (req, res, next) => {
  console.log('Monitor route accessed:', {
    method: req.method,
    path: req.path,
    url: req.url,
    body: req.body,
    headers: req.headers,
    route: req.route,
    baseUrl: req.baseUrl
  });
  next();
}, (req, res, next) => {
  if (!monitorRouter) {
    console.error('Monitor router is not properly imported');
    return res.status(500).json({ error: 'Monitor service not available' });
  }
  next();
}, monitorRouter);
console.log('Monitor routes mounted successfully');

// Mount rewards routes
const rewardsRouter = express.Router();
rewardsRouter.use('/process-daily', processRewardsRouter);
rewardsRouter.use('/events', rewardsEventsRouter);
app.use('/api/rewards', rewardsRouter);

// Discord Interactions endpoint
app.post('/api/discord-interactions', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const body = req.body;

    const isValidRequest = verifyKey(
      body, // Pass the raw buffer directly
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return res.status(401).send('Invalid request signature');
    }

    const interaction = JSON.parse(body);
    console.log('Interaction received:', {
      type: interaction.type,
      data: interaction.data
    });

    // Handle ping (type 1)
    if (interaction.type === 1) {
      return res.send({ type: 1 });
    }

    // Handle commands (type 2)
    if (interaction.type === 2) {
      const { name, options } = interaction.data;

      if (name === 'nft') {
        try {
          // Properly access the first option's value
          const input = options?.[0]?.value;
          if (!input) {
            return res.send({
              type: 4,
              data: {
                content: 'Please provide a collection and token ID in the format: collection.tokenId',
                flags: 64
              }
            });
          }

          const result = await handleNFTLookup(input);
          return res.send(result);
        } catch (error) {
          return res.send({
            type: 4,
            data: {
              content: `Error: ${error.message}`,
              flags: 64
            }
          });
        }
      }

      return res.send({
        type: 4,
        data: {
          content: 'Unknown command',
          flags: 64
        }
      });
    }

    return res.send({
      type: 4,
      data: {
        content: 'Unknown interaction type',
        flags: 64
      }
    });
  } catch (error) {
    console.error('Global interaction error:', error);
    return res.send({
      type: 4,
      data: {
        content: 'An error occurred while processing the command',
        flags: 64
      }
    });
  }
});

// API 404 handler (must be last)
app.use('/api/*', (req, res) => {
  console.log('404 Not Found:', req.method, req.path);
  res.status(404).json({ error: 'API endpoint not found' });
});

// Add catch-all error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
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
    console.error('Failed to connect to database. Please check your database connection settings:');
    console.error('- Ensure POSTGRES_URL is correctly set in .env');
    console.error('- Check if the database is accessible');
    console.error('- Verify network connectivity to the database host');
    process.exit(1);
  }

  // Start the server only after successful database connection
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Critical database initialization error:', err);
  process.exit(1);
});

export default app;