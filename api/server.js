import 'dotenv/config';
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

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 'https://buxdao.com' : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  }
}));

// Connect to database
connectDB();

// Routes
app.use('/api/auth', authRouter);
app.use('/api/user/balance', balanceRouter);
app.use('/api/user/claim', claimRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/celebcatz', celebcatzRouter);
app.use('/api/top-holders', topHoldersRouter);
app.use('/api/collection-counts', collectionCountsRouter);
app.use('/api/token-metrics', tokenMetricsRouter);

// Add a test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 