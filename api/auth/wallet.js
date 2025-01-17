import express from 'express';
import { PublicKey } from '@solana/web3.js';
import pool from '../../config/database.js';
import { syncUserRoles } from '../integrations/discord/roles.js';

const router = express.Router();

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

        // Get NFT holdings to update holder flags
        const nftHoldings = await client.query(
          `SELECT symbol, COUNT(*) as count
           FROM nft_metadata 
           WHERE owner_wallet = $1
           GROUP BY symbol`,
          [wallet_address]
        );

        // Update holder flags based on NFT holdings
        const updateFlags = await client.query(
          `UPDATE user_roles
           SET fcked_catz_holder = EXISTS(SELECT 1 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'FCKEDCATZ'),
               money_monsters_holder = EXISTS(SELECT 1 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'MM'),
               ai_bitbots_holder = EXISTS(SELECT 1 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'AIBB'),
               moneymonsters3d_holder = EXISTS(SELECT 1 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'MM3D'),
               celebcatz_holder = EXISTS(SELECT 1 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'CelebCatz'),
               fcked_catz_whale = (SELECT COUNT(*) >= 10 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'FCKEDCATZ'),
               money_monsters_whale = (SELECT COUNT(*) >= 10 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'MM'),
               ai_bitbots_whale = (SELECT COUNT(*) >= 10 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'AIBB'),
               moneymonsters3d_whale = (SELECT COUNT(*) >= 10 FROM nft_metadata WHERE owner_wallet = $1 AND symbol = 'MM3D'),
               bux_beginner = EXISTS(SELECT 1 FROM bux_holders WHERE wallet_address = $1 AND balance >= 1000),
               bux_builder = EXISTS(SELECT 1 FROM bux_holders WHERE wallet_address = $1 AND balance >= 10000),
               bux_saver = EXISTS(SELECT 1 FROM bux_holders WHERE wallet_address = $1 AND balance >= 50000),
               bux_banker = EXISTS(SELECT 1 FROM bux_holders WHERE wallet_address = $1 AND balance >= 100000),
               buxdao_5 = EXISTS(SELECT 1 FROM bux_holders WHERE wallet_address = $1 AND balance >= 500000)
           WHERE discord_id = $2
           RETURNING *`,
          [wallet_address, req.session.user.discord_id]
        );

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

        await client.query('COMMIT');
        console.log('Updated user_roles and ownership entries:', userRolesResult.rows[0]);
        
        // Sync Discord roles
        const guildId = process.env.DISCORD_GUILD_ID;
        const syncResult = await syncUserRoles(req.session.user.discord_id, guildId);
        console.log('Discord role sync result:', syncResult);
        
        return res.status(200).json({
          success: true,
          message: 'Wallet verified and ownership updated',
          rolesSynced: syncResult
        });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('Database error updating wallet address:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack,
        query: dbError.query
      });
      return res.status(500).json({
        success: false,
        message: dbError.message || 'Failed to update user roles'
      });
    }
  } catch (error) {
    console.error('Wallet verification error:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    return res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to verify wallet'
    });
  }
});

export default router; 