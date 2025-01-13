import { pool } from '../db';

const DAILY_YIELD_RATE = 0.001; // 0.1% daily yield
const SECONDS_PER_DAY = 86400;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.session?.user?.discord_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get user's current balance and last claim time
      const userQuery = `
        SELECT 
          bh.balance,
          bh.last_claim_time
        FROM bux_holders bh
        WHERE bh.owner_discord_id = $1
        FOR UPDATE
      `;
      
      const userResult = await client.query(userQuery, [req.session.user.discord_id]);
      
      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No BUX balance found' });
      }

      const { balance, last_claim_time } = userResult.rows[0];
      const dailyYield = balance * DAILY_YIELD_RATE;
      
      // Calculate unclaimed amount
      const now = new Date();
      const lastClaimTime = last_claim_time ? new Date(last_claim_time) : null;
      let unclaimedAmount = 0;

      if (lastClaimTime) {
        const secondsSinceLastClaim = (now - lastClaimTime) / 1000;
        const daysSinceLastClaim = secondsSinceLastClaim / SECONDS_PER_DAY;
        unclaimedAmount = dailyYield * Math.floor(daysSinceLastClaim);
      }

      if (unclaimedAmount <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No rewards to claim' });
      }

      // Update user's balance and last claim time
      const updateQuery = `
        UPDATE bux_holders
        SET 
          balance = balance + $1,
          last_claim_time = NOW()
        WHERE owner_discord_id = $2
        RETURNING balance, last_claim_time
      `;

      const updateResult = await client.query(updateQuery, [
        unclaimedAmount,
        req.session.user.discord_id
      ]);

      await client.query('COMMIT');

      res.json({
        claimed: unclaimedAmount,
        newBalance: updateResult.rows[0].balance,
        lastClaimed: updateResult.rows[0].last_claim_time
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error claiming rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 