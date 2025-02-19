import 'dotenv/config';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

console.log('Attempting to load .env from:', envPath);
try {
  const envFile = fs.readFileSync(envPath, 'utf8');
  const envVars = envFile.split('\n').reduce((acc, line) => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').trim();
      if (key && value) {
        process.env[key.trim()] = value;
      }
    }
    return acc;
  }, {});

  console.log('Environment variables loaded successfully');
  console.log('Loaded variables:', {
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    NODE_ENV: process.env.NODE_ENV,
    HAS_DISCORD_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
    HAS_SESSION_SECRET: !!process.env.SESSION_SECRET
  });
} catch (error) {
  console.error('Error loading .env file:', error);
  process.exit(1);
}

import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRouter from './auth/index.js';
import balanceRouter from './user/balance.js';
import claimRouter from './user/claim.js';
import collectionsRouter from './collections/index.js';
import celebcatzRouter from './celebcatz/index.js';
import topHoldersRouter from './top-holders.js';
import collectionCountsRouter from './collection-counts/index.js';
import tokenMetricsRouter from './token-metrics/index.js';
import { connectDB } from './config/database.js';
import axios from 'axios';
import webhookRouter from './discord/webhook.js';
import cookieParser from 'cookie-parser';

// Import monitor router with debug logging
console.log('Importing monitor router...');
import monitorRouter from './routes/monitor.js';  // Fix the import path to be relative to server.js location
console.log('Monitor router imported successfully');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Connect to database
connectDB();

// Printful API configuration
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

// Printful API endpoints
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
        'Content-Type': 'application/json'
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
        'Content-Type': 'application/json'
      }
    });

    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Mount monitor routes with error handling
console.log('Mounting monitor routes...');
try {
  if (!monitorRouter || typeof monitorRouter !== 'function') {
    throw new Error('Monitor router not properly imported');
  }
  
  app.use('/api/monitor', (req, res, next) => {
    console.log('Monitor route accessed:', {
      method: req.method,
      path: req.path,
      url: req.url,
      body: req.body,
      headers: req.headers,
      baseUrl: req.baseUrl
    });
    next();
  }, monitorRouter);
  console.log('Monitor routes mounted successfully');
} catch (error) {
  console.error('Error mounting monitor routes:', error);
}

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user/balance', balanceRouter);
app.use('/api/user/claim', claimRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/celebcatz', celebcatzRouter);
app.use('/api/top-holders', topHoldersRouter);
app.use('/api/collection-counts', collectionCountsRouter);
app.use('/api/token-metrics', tokenMetricsRouter);
app.use('/api/discord/webhook', webhookRouter);

// Add a test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Add a simple check for critical environment variables
console.log('Environment check:', {
  DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
  NODE_ENV: process.env.NODE_ENV || 'development'
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 