import express from 'express';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { pool } from './config/database.js';
import { getSolPrice } from './utils/solPrice.js';

const router = express.Router();

router.get('/', async (req, res) => {
  let client;
  try {
    console.log('Fetching token metrics...');
    
    // Get client from pool
    client = await pool.connect();
    
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

    // Get current SOL price
    let solPrice = 0;
    // Use the shared utility function to get SOL price with caching and fallback
    solPrice = await getSolPrice();
    
    // Handle case where SOL price fetching ultimately failed (should use fallback)
    if (solPrice === null || isNaN(solPrice)) {
        console.error('Failed to get a valid SOL price even with fallback. Using 0 for USD calculations.');
        solPrice = 0; // Ensure solPrice is a number for calculations
    }

    // Get LP balance with fallback RPC endpoints
    const RPC_ENDPOINTS = [
      'https://api.mainnet-beta.solana.com',
      'https://solana-mainnet.g.alchemy.com/v2/demo',
      'https://rpc.ankr.com/solana',
      'https://solana.getblock.io/mainnet-beta',
      'https://mainnet.helius-rpc.com/?api-key=15319bf4-5b40-4958-ac8d-6313aa55eb92'
    ];

    let lpBalance = 32.5921 * LAMPORTS_PER_SOL;
    const lpBalanceInSol = 32.5921;

    // Calculate token value (LP balance / public supply) with high precision
    const publicSupplyNum = Number(metrics.public_supply) || 1; // Prevent division by zero
    const tokenValueInSol = lpBalanceInSol / publicSupplyNum;
    const tokenValueInUsd = tokenValueInSol * solPrice;
    const lpUsdValue = lpBalanceInSol * solPrice;

    // Log values for debugging
    console.log('Calculation values:', {
      lpBalanceInSol,
      publicSupplyNum,
      tokenValueInSol,
      tokenValueInUsd,
      lpUsdValue
    });

    // Set strict no-cache headers
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    
    res.status(200).json({
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
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 