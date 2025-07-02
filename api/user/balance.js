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

    // Get user's aggregated BUX balance and unclaimed rewards across all wallets
    const query = `
      SELECT 
        COALESCE(SUM(bh.balance), 0) as balance,
        ca.unclaimed_amount
      FROM claim_accounts ca
      LEFT JOIN bux_holders bh ON bh.owner_discord_id = ca.discord_id
      WHERE ca.discord_id = $1
      GROUP BY ca.discord_id, ca.unclaimed_amount
    `;

    console.log('Executing query with discord_id:', req.session.user.discord_id);
    const result = await client.query(query, [req.session.user.discord_id]);
    console.log('Query result:', result.rows[0]);
    
    if (!result.rows[0]) {
      console.log('No results found for user');
      return res.json({
        balance: 0,
        unclaimed_amount: 0
      });
    }

    const response = {
      balance: parseInt(result.rows[0].balance) || 0,
      unclaimed_amount: parseInt(result.rows[0].unclaimed_amount) || 0
    };
    console.log('Sending response:', response);

    res.json(response);
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