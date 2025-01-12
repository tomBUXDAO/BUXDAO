import express from 'express';
import { PublicKey } from '@solana/web3.js';
import pg from 'pg';

const router = express.Router();
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

router.post('/', async (req, res) => {
  try {
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({
        success: false,
        message: 'Wallet address is required'
      });
    }

    // Validate Solana address
    try {
      new PublicKey(wallet_address);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid wallet address'
      });
    }

    // Check Discord authentication
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Must authenticate with Discord first'
      });
    }

    // Store wallet address in session
    req.session.user.wallet_address = wallet_address;

    // Update user_roles with wallet address
    try {
      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE user_roles 
           SET wallet_address = $1
           WHERE discord_id = $2`,
          [wallet_address, req.session.user.discord_id]
        );
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user roles'
      });
    }
    
    res.json({
      success: true,
      message: 'Wallet connected successfully'
    });
  } catch (error) {
    console.error('Wallet auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router; 