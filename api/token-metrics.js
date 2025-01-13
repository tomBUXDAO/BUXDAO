import express from 'express';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import pool from '../config/database.js';

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
    try {
      console.log('Fetching SOL price from CoinGecko...');
      const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (!solPriceResponse.ok) {
        throw new Error(`CoinGecko API error: ${solPriceResponse.statusText}`);
      }
      const solPriceData = await solPriceResponse.json();
      solPrice = Number(solPriceData.solana?.usd || 0);
    } catch (error) {
      console.error('Error fetching SOL price:', error);
      solPrice = 195; // Fallback price
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

    // Log values for debugging
    console.log('Calculation values:', {
      lpBalanceInSol,
      publicSupplyNum,
      tokenValueInSol,
      tokenValueInUsd,
      lpUsdValue
    });

    res.setHeader('Cache-Control', 'public, s-maxage=60');
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