import express from 'express';
import { PublicKey } from '@solana/web3.js';
import pg from 'pg';
import { syncUserRoles } from '../discord/roles.js';

const router = express.Router();
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

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
        await client.query('BEGIN');

        // First update user_roles
        const userRolesResult = await client.query(
          `UPDATE user_roles 
           SET wallet_address = $1,
               last_updated = CURRENT_TIMESTAMP
           WHERE discord_id = $2
           RETURNING *`,
          [wallet_address, req.session.user.discord_id]
        );
        
        if (userRolesResult.rowCount === 0) {
          console.error('No user_roles entry found for discord_id:', req.session.user.discord_id);
          await client.query('ROLLBACK');
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // Insert or update bux_holders with 0 balance if no entry exists
        await client.query(
          `INSERT INTO bux_holders (
             wallet_address, 
             owner_discord_id, 
             owner_name, 
             balance, 
             is_exempt
           )
           VALUES ($1, $2, $3, 0, false)
           ON CONFLICT (wallet_address) 
           DO UPDATE SET 
             owner_discord_id = $2,
             owner_name = $3,
             last_updated = CURRENT_TIMESTAMP`,
          [wallet_address, req.session.user.discord_id, req.session.user.discord_username]
        );

        // Update nft_metadata
        await client.query(
          `UPDATE nft_metadata 
           SET owner_discord_id = $1,
               owner_name = $2
           WHERE owner_wallet = $3`,
          [req.session.user.discord_id, req.session.user.discord_username, wallet_address]
        );

        // Sync Discord roles
        await syncUserRoles(req.session.user.discord_id, DISCORD_GUILD_ID);

        await client.query('COMMIT');
        console.log('Updated user_roles and ownership entries:', userRolesResult.rows[0]);
        
        return res.status(200).json({
          success: true,
          message: 'Wallet verified and ownership updated'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('Database error updating wallet address:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update user roles'
      });
    }
  } catch (error) {
    console.error('Wallet verification error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Failed to verify wallet'
    });
  }
});

export default router; 