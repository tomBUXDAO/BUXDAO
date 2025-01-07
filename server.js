import express from 'express';
import cors from 'cors';
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://buxdao-3-0.vercel.app',
    'https://buxdao.com',
    'https://www.buxdao.com'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Database setup
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Stats endpoint
app.get('/api/collections/:symbol/stats', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching stats for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Add celebcatz images endpoint with optimized query
app.get('/api/celebcatz/images', async (req, res) => {
  console.log('Endpoint hit: /api/celebcatz/images');
  
  // Set a timeout for the request
  req.setTimeout(30000);
  res.setTimeout(30000);
  
  try {
    const query = {
      text: `
        SELECT image_url, name 
        FROM nft_metadata 
        WHERE symbol = $1 
        AND name LIKE $2 
        AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= $3
        ORDER BY CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER)
      `,
      values: ['CelebCatz', 'Celebrity Catz #%', 79],
      // Set a query timeout
      query_timeout: 25000
    };
    
    console.log('Executing query...');
    const result = await pool.query(query);
    console.log(`Query completed. Found ${result.rows.length} images`);
    
    if (result.rows.length === 0) {
      console.log('No images found');
      return res.json([]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Database query failed:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
    res.status(500).json({ 
      error: 'Failed to fetch images', 
      details: error.message,
      code: error.code 
    });
  }
});

// Add Printful products endpoint
app.get('/api/printful/products', async (req, res) => {
  try {
    const response = await fetch('https://api.printful.com/store/products', {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Invalid response format from Printful API');
    }

    const products = data.result.map(item => ({
      id: item.id,
      name: item.name,
      thumbnail_url: item.thumbnail_url,
      variants: item.variants || 0,
      sync_product: item.sync_product,
      sync_variants: item.sync_variants
    }));

    res.json(products);
  } catch (error) {
    console.error('Error fetching from Printful:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add Printful product details endpoint
app.get('/api/printful/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`https://api.printful.com/store/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Invalid response format from Printful API');
    }

    res.json(data.result);
  } catch (error) {
    console.error('Error fetching product from Printful:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add token metrics endpoint
app.get('/api/token-metrics', async (req, res) => {
  try {
    // Get supply metrics from database
    const result = await pool.query(`
      SELECT 
        SUM(balance) as total_supply,
        SUM(CASE WHEN is_exempt = FALSE THEN balance ELSE 0 END) as public_supply,
        SUM(CASE WHEN is_exempt = TRUE THEN balance ELSE 0 END) as exempt_supply
      FROM bux_holders
    `);

    const metrics = result.rows[0];

    // Get current SOL price
    const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const solPriceData = await solPriceResponse.json();
    const solPrice = solPriceData.solana?.usd || 0;

    // Get LP wallet balance using Solana RPC
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const lpWalletAddress = new PublicKey('3WNHW6sr1sQdbRjovhPrxgEJdWASZ43egGWMMNrhgoRR');
    const lpBalance = await connection.getBalance(lpWalletAddress);
    const lpBalanceInSol = (lpBalance / LAMPORTS_PER_SOL) + 20.2; // Convert lamports to SOL and add debt

    // Calculate token value (LP balance / public supply)
    const tokenValueInSol = metrics.public_supply > 0 ? lpBalanceInSol / metrics.public_supply : 0;

    console.log('Token Metrics:', {
      totalSupply: metrics.total_supply,
      publicSupply: metrics.public_supply,
      exemptSupply: metrics.exempt_supply,
      lpBalanceInSol,
      solPrice,
      tokenValueInSol
    });

    res.json({
      totalSupply: metrics.total_supply || 0,
      publicSupply: metrics.public_supply || 0,
      exemptSupply: metrics.exempt_supply || 0,
      liquidityPool: lpBalanceInSol,
      solPrice: solPrice,
      tokenValue: tokenValueInSol
    });

  } catch (error) {
    console.error('Error fetching token metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add top holders endpoint
app.get('/api/top-holders', async (req, res) => {
  try {
    // Get token metrics first for LP and public supply
    const metricsResult = await pool.query(`
      SELECT 
        SUM(CASE WHEN is_exempt = FALSE THEN balance ELSE 0 END) as public_supply
      FROM bux_holders
    `);
    
    // Get LP balance
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const lpWalletAddress = new PublicKey('3WNHW6sr1sQdbRjovhPrxgEJdWASZ43egGWMMNrhgoRR');
    const lpBalance = await connection.getBalance(lpWalletAddress);
    const lpBalanceInSol = (lpBalance / LAMPORTS_PER_SOL) + 20.2;
    
    // Calculate token value
    const publicSupply = metricsResult.rows[0].public_supply;
    const tokenValueInSol = publicSupply > 0 ? lpBalanceInSol / publicSupply : 0;

    // Get SOL price
    const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const solPriceData = await solPriceResponse.json();
    const solPrice = solPriceData.solana?.usd || 0;

    // Get top 5 non-exempt holders by balance
    const result = await pool.query(`
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
      LIMIT 5
    `);

    console.log('Top holders query result:', result.rows);

    // Format the data
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

    console.log('Formatted holders:', holders);
    res.json({ holders });

  } catch (error) {
    console.error('Error fetching top holders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the server when this file is run directly
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the Express app
export default app; 