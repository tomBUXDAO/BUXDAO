import express from 'express';
import { PublicKey } from '@solana/web3.js';
import pool from '../../config/database.js';
import { syncUserRoles } from '../integrations/discord/roles.js';

const router = express.Router();

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

router.post('/', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.user) {
      console.error('Session validation failed:', {
        session: !!req.session,
        user: !!req.session?.user,
        sessionID: req.sessionID
      });
      return res.status(401).json({ error: 'Not authenticated - no valid session' });
    }

    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Save wallet address to session
    req.session.user.walletAddress = walletAddress;
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Update database
    const result = await pool.query(
      'UPDATE user_roles SET wallet_address = $1 WHERE discord_id = $2 RETURNING *',
      [walletAddress, req.session.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Wallet verified successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Wallet verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 