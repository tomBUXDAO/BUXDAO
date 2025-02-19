import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  if (!req.session?.user?.discord_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let client;
  try {
    client = await pool.connect();

    // Get user's BUX balance and unclaimed rewards
    const query = `
      SELECT 
        bh.balance,
        ca.unclaimed_amount
      FROM bux_holders bh
      LEFT JOIN claim_accounts ca ON ca.discord_id = bh.owner_discord_id
      WHERE bh.owner_discord_id = $1
    `;

    const result = await client.query(query, [req.session.user.discord_id]);
    
    if (!result.rows[0]) {
      return res.json({
        balance: 0,
        unclaimed_amount: 0
      });
    }

    res.json({
      balance: parseInt(result.rows[0].balance) || 0,
      unclaimed_amount: parseInt(result.rows[0].unclaimed_amount) || 0
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 