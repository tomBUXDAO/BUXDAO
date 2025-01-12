import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import NodeCache from 'node-cache';
import cookieParser from 'cookie-parser';
import client from './config/database.js';
import authCheckRouter from './api/auth/check.js';
import discordAuthRouter from './api/auth/discord.js';
import discordCallbackRouter from './api/auth/discord/callback.js';
import walletAuthRouter from './api/auth/wallet.js';
import logoutRouter from './api/auth/logout.js';
import collectionsRouter from './api/collections/index.js';
import celebcatzRouter from './api/celebcatz/index.js';
import topHoldersHandler from './api/top-holders.js';

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://buxdao.com', 'https://www.buxdao.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin']
}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

// Debug middleware for all requests
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  // Add response logging
  const oldSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] Response ${res.statusCode} sent in ${duration}ms`);
    return oldSend.apply(res, arguments);
  };
  
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  console.error('Stack trace:', err.stack);
  
  // Send appropriate error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code,
    path: req.path
  });
});

// API routes should be defined before any static file handling
app.use('/api/auth/check', authCheckRouter);
app.use('/api/auth/discord', discordAuthRouter);
app.use('/api/auth/discord/callback', discordCallbackRouter);
app.use('/api/auth/wallet', walletAuthRouter);
app.use('/api/auth/logout', logoutRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/celebcatz', celebcatzRouter);
app.use('/api/top-holders', topHoldersHandler);

// Edge Function routes - must be before static files
app.use('/api/printful', (req, res, next) => {
  // Return 404 for Edge Function routes
  res.status(404).json({
    error: 'Edge Function route',
    message: 'This route should be handled by Edge Functions'
  });
});

// Static file serving - explicitly exclude API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  express.static('dist')(req, res, next);
});

// Catch-all route for the frontend SPA - explicitly exclude API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.sendFile('index.html', { root: 'dist' });
});

const cache = new NodeCache({ stdTTL: 60 }); // Cache for 60 seconds

// Helper function to get token metrics
async function getTokenMetrics() {
  const lpWalletAddress = new PublicKey('3WNHW6sr1sQdbRjovhPrxgEJdWASZ43egGWMMNrhgoRR');
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const lpBalance = await connection.getBalance(lpWalletAddress);
  const lpBalanceInSol = (lpBalance / LAMPORTS_PER_SOL) + 20.2;

  const metricsResult = await client.query(`
    SELECT SUM(CASE WHEN is_exempt = FALSE THEN balance ELSE 0 END) as public_supply
    FROM bux_holders
  `);
  const publicSupply = metricsResult.rows[0].public_supply;
  const tokenValueInSol = lpBalanceInSol / publicSupply;

  return { lpBalanceInSol, tokenValueInSol };
}

// Add celebcatz images endpoint with better error handling
app.get('/api/celebcatz/images', async (req, res) => {
  console.log(`[${new Date().toISOString()}] Fetching CelebCatz images`);
  
  try {
    const query = {
      text: `
        SELECT image_url, name 
        FROM nft_metadata 
        WHERE symbol = 'CelebCatz' 
        AND name LIKE 'Celebrity Catz #%'
        ORDER BY CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER)
      `
    };
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin');
    
    console.log(`[${new Date().toISOString()}] Executing CelebCatz query:`, query.text);
    const result = await client.query(query);
    console.log(`[${new Date().toISOString()}] Query completed. Found ${result.rows.length} images`);
    
    if (result.rows.length === 0) {
      console.log(`[${new Date().toISOString()}] No images found`);
      return res.json([]);
    }
    
    // Log a sample of the data
    console.log('Sample data:', result.rows.slice(0, 2));
    
    res.json(result.rows);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database query failed:`, error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      schema: error.schema,
      table: error.table,
      constraint: error.constraint
    });
    
    // Set CORS headers even for errors
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin');
    
    res.status(500).json({ 
      error: 'Failed to fetch images', 
      details: error.message,
      code: error.code 
    });
  }
});

// Add token metrics endpoint
app.get('/api/token-metrics', async (req, res) => {
  try {
    console.log('Fetching token metrics...');
    
    // Test database connection
    try {
      await client.query('SELECT NOW()');
      console.log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      throw new Error('Database connection failed');
    }

    // Get supply metrics from database
    console.log('Querying supply metrics...');
    const result = await client.query(`
      SELECT 
        SUM(balance) as total_supply,
        SUM(CASE WHEN is_exempt = FALSE THEN balance ELSE 0 END) as public_supply,
        SUM(CASE WHEN is_exempt = TRUE THEN balance ELSE 0 END) as exempt_supply
      FROM bux_holders
    `);

    console.log('Raw supply metrics:', result.rows[0]);
    const metrics = result.rows[0];

    // Get current SOL price with caching
    let solPrice = cache.get('solPrice');
    if (solPrice === undefined) {
      try {
        console.log('Fetching SOL price from CoinGecko...');
        const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        if (!solPriceResponse.ok) {
          throw new Error(`CoinGecko API error: ${solPriceResponse.statusText}`);
        }
        const solPriceData = await solPriceResponse.json();
        solPrice = Number(solPriceData.solana?.usd || 0);
        cache.set('solPrice', solPrice);
      } catch (error) {
        console.error('Error fetching SOL price:', error);
        solPrice = cache.get('solPrice') || 0;
      }
    }
    console.log('SOL price:', solPrice);

    // Get LP balance with fallback RPC endpoints
    const RPC_ENDPOINTS = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-mainnet.g.alchemy.com/v2/demo',
      'https://rpc.ankr.com/solana',
      'https://solana.getblock.io/mainnet-beta',
      'https://mainnet.helius-rpc.com/?api-key=15319bf4-5b40-4958-ac8d-6313aa55eb92'
    ];

    let lpBalance = null;
    const lpWalletAddress = new PublicKey('3WNHW6sr1sQdbRjovhPrxgEJdWASZ43egGWMMNrhgoRR');

    for (const endpoint of RPC_ENDPOINTS) {
      try {
        console.log(`Trying RPC endpoint: ${endpoint}`);
        const connection = new Connection(endpoint);
        lpBalance = await connection.getBalance(lpWalletAddress);
        if (lpBalance !== null) {
          console.log(`Successfully got balance from ${endpoint}`);
          break;
        }
      } catch (error) {
        console.error(`Failed to fetch balance from ${endpoint}:`, error.message);
        continue;
      }
    }

    if (lpBalance === null) {
      console.warn('Using fallback LP balance');
      lpBalance = 32.380991533 * LAMPORTS_PER_SOL;
    }

    const lpBalanceInSol = (lpBalance / LAMPORTS_PER_SOL) + 20.2;
    console.log('LP balance in SOL:', lpBalanceInSol);

    // Calculate token value (LP balance / public supply) with high precision
    const publicSupplyNum = Number(metrics.public_supply) || 1; // Prevent division by zero
    const tokenValueInSol = lpBalanceInSol / publicSupplyNum;
    const tokenValueInUsd = tokenValueInSol * solPrice;
    const lpUsdValue = lpBalanceInSol * solPrice;

    // Format values for logging with high precision
    const formatForLog = (num) => num.toFixed(8);

    console.log('Token Metrics:', {
      totalSupply: metrics.total_supply,
      publicSupply: metrics.public_supply,
      exemptSupply: metrics.exempt_supply,
      lpBalanceInSol: formatForLog(lpBalanceInSol),
      solPrice: solPrice,
      tokenValueInSol: formatForLog(tokenValueInSol),
      tokenValueInUsd: formatForLog(tokenValueInUsd),
      lpUsdValue: formatForLog(lpUsdValue)
    });

    // Send raw values to client for formatting
    res.json({
      totalSupply: Number(metrics.total_supply) || 0,
      publicSupply: Number(metrics.public_supply) || 0,
      exemptSupply: Number(metrics.exempt_supply) || 0,
      liquidityPool: lpBalanceInSol,
      solPrice: solPrice,
      tokenValue: tokenValueInSol,
      tokenValueUsd: tokenValueInUsd,
      lpUsdValue: lpUsdValue
    });

  } catch (error) {
    console.error('Error in token metrics endpoint:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Add top holders endpoint with filters
app.get('/api/top-holders', async (req, res) => {
  try {
    const { type = 'bux', collection = 'all' } = req.query;
    const PROJECT_WALLET = 'CatzBPyMJcQgnAZ9hCtSNzDTrLLsRxerJYwh5LMe87kY';
    const ME_ESCROW = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';
    let query;
    let result;

    // Get SOL price with caching
    let solPrice = cache.get('solPrice');
    if (!solPrice) {
      try {
        const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        if (!solPriceResponse.ok) throw new Error(`CoinGecko API error: ${solPriceResponse.statusText}`);
        const solPriceData = await solPriceResponse.json();
        solPrice = Number(solPriceData.solana?.usd || 0);
        cache.set('solPrice', solPrice);
      } catch (error) {
        console.error('Error fetching SOL price:', error);
        solPrice = 195; // Fallback price
      }
    }

    // Get token metrics once
    const { tokenValueInSol } = await getTokenMetrics();

    if (type === 'bux,nfts') {
      // Get BUX balances
      const buxQuery = `
        SELECT 
          wallet_address,
          owner_name as discord_name,
          balance,
          is_exempt
        FROM bux_holders 
        WHERE is_exempt = FALSE
      `;
      const buxResult = await client.query(buxQuery);
      
      // Get all NFT holdings
      const nftQuery = `
        SELECT owner_wallet, symbol, COUNT(*) as count
        FROM nft_metadata 
        WHERE owner_wallet NOT IN ($1, $2)
        AND owner_wallet IS NOT NULL 
        AND owner_wallet != ''
        GROUP BY owner_wallet, symbol
      `;
      const nftResult = await client.query(nftQuery, [PROJECT_WALLET, ME_ESCROW]);

      // Default floor prices
      const floorPrices = {
        'FCKEDCATZ': 0.045,
        'MM': 0.069,
        'AIBB': 0.35,
        'MM3D': 0.04,
        'CelebCatz': 0.489
      };

      // Combine holdings
      const combinedHoldings = {};
      
      // Add BUX holdings
      for (const holder of buxResult.rows) {
        const wallet = holder.wallet_address;
        if (!combinedHoldings[wallet]) {
          combinedHoldings[wallet] = {
            address: holder.discord_name || wallet.slice(0, 4) + '...' + wallet.slice(-4),
            buxBalance: Number(holder.balance),
            nftCount: 0,
            buxValue: Number(holder.balance) * tokenValueInSol,
            nftValue: 0
          };
        }
      }

      // Add NFT holdings
      for (const nft of nftResult.rows) {
        const wallet = nft.owner_wallet;
        if (!combinedHoldings[wallet]) {
          combinedHoldings[wallet] = {
            address: wallet.slice(0, 4) + '...' + wallet.slice(-4),
            buxBalance: 0,
            nftCount: 0,
            buxValue: 0,
            nftValue: 0
          };
        }
        combinedHoldings[wallet].nftCount += Number(nft.count);
        combinedHoldings[wallet].nftValue += Number(nft.count) * (floorPrices[nft.symbol] || 0);
      }

      // Format and sort combined holdings
      const holders = Object.values(combinedHoldings)
        .map(holder => ({
          address: holder.address,
          bux: holder.buxBalance.toLocaleString(),
          nfts: `${holder.nftCount} NFTs`,
          value: `${(holder.buxValue + holder.nftValue).toFixed(2)} SOL ($${((holder.buxValue + holder.nftValue) * solPrice).toFixed(2)})`
        }))
        .sort((a, b) => {
          const valueA = parseFloat(a.value.split(' ')[0]);
          const valueB = parseFloat(b.value.split(' ')[0]);
          return valueB - valueA;
        });

      return res.json({ holders });
    }

    if (type === 'nfts') {
      // Map frontend names to DB symbols
      const dbSymbols = {
        'fckedcatz': 'FCKEDCATZ',
        'moneymonsters': 'MM',
        'aibitbots': 'AIBB',
        'moneymonsters3d': 'MM3D',
        'celebcatz': 'CelebCatz'
      };

      // Default floor prices (in case ME API fails)
      const floorPrices = {
        'FCKEDCATZ': 0.045,
        'MM': 0.069,
        'AIBB': 0.35,
        'MM3D': 0.04,
        'CelebCatz': 0.489
      };

      // Get NFT counts
      const dbSymbol = collection !== 'all' ? dbSymbols[collection] : null;
      query = `
        SELECT owner_wallet, symbol, COUNT(*) as count
        FROM nft_metadata 
        WHERE owner_wallet NOT IN ($1, $2)
        AND owner_wallet IS NOT NULL 
        AND owner_wallet != ''
        ${dbSymbol ? 'AND symbol = $3' : ''}
        GROUP BY owner_wallet, symbol
      `;
      
      const params = dbSymbol ? [PROJECT_WALLET, ME_ESCROW, dbSymbol] : [PROJECT_WALLET, ME_ESCROW];
      result = await client.query(query, params);

      // Calculate totals
      const totals = {};
      for (const row of result.rows) {
        const { owner_wallet, symbol, count } = row;
        if (!totals[owner_wallet]) {
          totals[owner_wallet] = { nfts: 0, value: 0 };
        }
        totals[owner_wallet].nfts += Number(count);
        totals[owner_wallet].value += Number(count) * (floorPrices[symbol] || 0);
      }

      // Format response
      const holders = Object.entries(totals)
        .map(([wallet, data]) => ({
          address: wallet.slice(0, 4) + '...' + wallet.slice(-4),
          amount: `${data.nfts} NFTs`,
          value: `${data.value.toFixed(2)} SOL ($${(data.value * solPrice).toFixed(2)})`
        }))
        .sort((a, b) => {
          const valueA = parseFloat(a.value.split(' ')[0]);
          const valueB = parseFloat(b.value.split(' ')[0]);
          return valueB - valueA;
        });

      return res.json({ holders });
    }

    if (type === 'bux') {
      // Get BUX holders
      query = `
        SELECT 
          wallet_address as address,
          owner_name as discord_name,
          balance as amount,
          is_exempt,
          ROUND((balance * 100.0 / (
            SELECT SUM(balance) FROM bux_holders WHERE is_exempt = FALSE
          )), 2) as percentage
        FROM bux_holders 
        WHERE is_exempt = FALSE
        ORDER BY balance DESC
      `;
      
      result = await client.query(query);

      // Format BUX holders
      const holders = result.rows.map(holder => {
        const balanceInSol = Number(holder.amount) * tokenValueInSol;
        const balanceInUsd = balanceInSol * solPrice;
        return {
          address: holder.discord_name || holder.address.slice(0, 4) + '...' + holder.address.slice(-4),
          amount: Number(holder.amount).toLocaleString(),
          percentage: holder.percentage + '%',
          value: `${balanceInSol.toFixed(2)} SOL ($${balanceInUsd.toFixed(2)})`
        };
      });

      return res.json({ holders });
    }

    return res.status(400).json({ error: 'Invalid type parameter' });

  } catch (error) {
    console.error('Error in top holders endpoint:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, 'localhost', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the Express app
export default app;