import express from 'express';
import pool from '../../config/database.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ status: 'Wallet endpoint is working' });
});

router.post('/', async (req, res) => {
  console.log('Received wallet verification request:', req.body);
  
  try {
    const { walletAddress, discord_id, discord_username } = req.body;

    if (!walletAddress || !discord_id || !discord_username) {
      console.log('Missing fields:', { walletAddress, discord_id, discord_username });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Begin transaction
      await pool.query('BEGIN');
      console.log('Started transaction');

      // Insert or update user in user_roles table
      // The triggers will handle updating nft_metadata, bux_holders, and roles
      const result = await pool.query(
        `INSERT INTO user_roles (discord_id, wallet_address, discord_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (discord_id) 
         DO UPDATE SET 
           wallet_address = $2,
           discord_name = $3,
           last_updated = CURRENT_TIMESTAMP
         RETURNING *`,
        [discord_id, walletAddress, discord_username]
      );

      // Get the updated roles
      const roles = Object.entries(result.rows[0])
        .filter(([key, value]) => value === true)
        .map(([key]) => key.replace(/_/g, ' '));

      // Commit transaction
      await pool.query('COMMIT');
      console.log('Transaction committed');

      res.json({
        success: true,
        user: result.rows[0],
        roles: roles
      });

    } catch (error) {
      // Rollback transaction on error
      await pool.query('ROLLBACK');
      console.error('Database error:', error);
      throw error;
    }

  } catch (error) {
    console.error('Wallet verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      details: error.message
    });
  }
});

export default router;