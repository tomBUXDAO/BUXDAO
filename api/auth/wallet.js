import express from 'express';
import { PublicKey, Connection } from '@solana/web3.js';
import pool from '../../config/database.js';
import { syncUserRoles } from '../integrations/discord/roles.js';
import { checkHoldings } from '../utils/holdings.js';

const router = express.Router();

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

router.post('/', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.user) {
      console.error('Session validation failed:', {
        session: !!req.session,
        user: !!req.session?.user,
        sessionID: req.sessionID
      });
      return res.status(401).json({ 
        success: false,
        error: 'Not authenticated - no valid session' 
      });
    }

    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ 
        success: false,
        error: 'Wallet address is required' 
      });
    }

    // Validate Solana address
    try {
      new PublicKey(walletAddress);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid wallet address' 
      });
    }

    // Save wallet address to session
    req.session.user.walletAddress = walletAddress;
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Create database client
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Update wallet address
      const result = await client.query(
        'UPDATE user_roles SET wallet_address = $1 WHERE discord_id = $2 RETURNING *',
        [walletAddress, req.session.user.discord_id]
      );

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      // Check holdings
      const connection = new Connection(RPC_URL);
      const holdings = await checkHoldings(connection, walletAddress);

      // Update holdings in database
      await client.query(`
        UPDATE user_roles 
        SET 
          fcked_catz_holder = $1,
          money_monsters_holder = $2,
          ai_bitbots_holder = $3,
          moneymonsters3d_holder = $4,
          celebcatz_holder = $5,
          last_updated = CURRENT_TIMESTAMP
        WHERE discord_id = $6
      `, [
        holdings.fckedCatz > 0,
        holdings.moneyMonsters > 0,
        holdings.aiBitbots > 0,
        holdings.moneyMonsters3d > 0,
        holdings.celebCatz > 0,
        req.session.user.discord_id
      ]);

      await client.query('COMMIT');

      // Sync Discord roles
      await syncUserRoles(req.session.user.discord_id, DISCORD_GUILD_ID);

      res.json({ 
        success: true,
        message: 'Wallet verified and holdings updated successfully', 
        user: result.rows[0],
        holdings
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Wallet verification error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

export default router; 