import express from 'express';
import { PublicKey } from '@solana/web3.js';

const router = express.Router();

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

    // Store wallet address in session
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'Must authenticate with Discord first'
      });
    }

    req.session.user.wallet_address = wallet_address;
    
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