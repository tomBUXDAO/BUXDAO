import pool from '../../config/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
        bh.unclaimed_rewards
      FROM bux_holders bh
      WHERE bh.owner_discord_id = $1
    `;

    const result = await client.query(query, [req.session.user.discord_id]);
    
    if (!result.rows[0]) {
      return res.json({
        balance: 0,
        unclaimed_rewards: 0
      });
    }

    res.json({
      balance: parseInt(result.rows[0].balance) || 0,
      unclaimed_rewards: parseInt(result.rows[0].unclaimed_rewards) || 0
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) {
      client.release();
    }
  }
} 