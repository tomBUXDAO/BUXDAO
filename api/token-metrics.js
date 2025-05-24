import express from 'express';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { pool } from './config/database.js';
import { getSolPrice } from './utils/solPrice.js';

const router = express.Router();

// Define the treasury wallet address
const TREASURY_WALLET = 'FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75';

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
        SUM(balance) as total_bux_holders_supply,
        SUM(CASE WHEN wallet_address != $1 THEN balance ELSE 0 END) as public_bux_holders_supply,
        SUM(CASE WHEN wallet_address = $1 THEN balance ELSE 0 END) as treasury_supply
      FROM bux_holders
    `, [TREASURY_WALLET]);

    console.log('Raw bux_holders supply metrics:', result.rows[0]);
    const buxHoldersMetrics = result.rows[0];

    // Get total unclaimed amount from claim_accounts
    console.log('Querying unclaimed amounts...');
    const unclaimedResult = await client.query(`
      SELECT SUM(unclaimed_amount) as total_unclaimed
      FROM claim_accounts
    `);

    console.log('Raw unclaimed amounts:', unclaimedResult.rows[0]);
    const totalUnclaimed = Number(unclaimedResult.rows[0]?.total_unclaimed) || 0;

    // Calculate total and public supply
    const total_supply = Number(buxHoldersMetrics.total_bux_holders_supply) + totalUnclaimed;
    const public_supply = Number(buxHoldersMetrics.public_bux_holders_supply) + totalUnclaimed;
    const exempt_supply = Number(buxHoldersMetrics.treasury_supply) || 0; // Now just the treasury supply

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

    // Start with the hardcoded value for the amount owed
    const owedSol = 32.6921;
    let fetchedLpBalanceSol = 0; // To store the fetched LP balance in SOL

    const lpWalletAddress = new PublicKey('3WNHW6sr1sQdbRjovhPrxgEJdWASZ43egGWMMNrhgoRR');

    // Attempt to fetch the actual LP balance from the blockchain
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const connection = new Connection(endpoint, 'confirmed');
        const balance = await connection.getBalance(lpWalletAddress);
        if (balance !== null) {
          fetchedLpBalanceSol = balance / LAMPORTS_PER_SOL;
          console.log(`Successfully fetched LP balance from ${endpoint}: ${fetchedLpBalanceSol} SOL`);
          break; // Exit loop on success
        }
      } catch (error) {
        console.error(`Failed to fetch LP balance from ${endpoint}:`, error);
        // Try the next endpoint
      }
    }

    // Calculate the final LP balance as the sum of the owed amount and the fetched LP balance
    const lpBalanceInSol = owedSol + fetchedLpBalanceSol;

    // Calculate token value (LP balance / public supply) with high precision
    const publicSupplyNum = public_supply || 1; // Prevent division by zero
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
      totalSupply: total_supply,
      publicSupply: public_supply,
      exemptSupply: exempt_supply,
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