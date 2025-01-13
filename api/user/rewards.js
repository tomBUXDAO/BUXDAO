import pool from '../../config/database.js';

const DAILY_YIELD_RATE = 0.001; // 0.1% daily yield
const SECONDS_PER_DAY = 86400;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.session?.user?.discord_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const client = await pool.connect();

    try {
      // Get user's BUX balance and last claim time
      const userQuery = `
        SELECT 
          bh.balance,
          bh.last_claim_time
        FROM bux_holders bh
        WHERE bh.owner_discord_id = $1
      `;
      
      const userResult = await client.query(userQuery, [req.session.user.discord_id]);
      
      if (userResult.rows.length === 0) {
        return res.json({
          dailyYield: 0,
          unclaimedAmount: 0,
          lastClaimed: null
        });
      }

      const { balance, last_claim_time } = userResult.rows[0];
      const dailyYield = balance * DAILY_YIELD_RATE;
      
      // Calculate unclaimed amount based on time since last claim
      const now = new Date();
      const lastClaimTime = last_claim_time ? new Date(last_claim_time) : null;
      let unclaimedAmount = 0;

      if (lastClaimTime) {
        const secondsSinceLastClaim = (now - lastClaimTime) / 1000;
        const daysSinceLastClaim = secondsSinceLastClaim / SECONDS_PER_DAY;
        unclaimedAmount = dailyYield * Math.floor(daysSinceLastClaim);
      }

      res.json({
        dailyYield,
        unclaimedAmount,
        lastClaimed: last_claim_time
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 