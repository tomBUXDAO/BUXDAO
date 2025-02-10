import pool from '../../config/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify secret token to ensure only authorized calls
  const secretToken = req.headers['x-secret-token'];
  if (secretToken !== process.env.CRON_SECRET_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const client = await pool.connect();

    try {
      // Call the process_pending_rewards function
      await client.query('SELECT process_pending_rewards()');

      // Get stats about processed rewards
      const stats = await client.query(`
        SELECT 
          COUNT(*) as processed_count,
          SUM(total_daily_reward) as total_rewards
        FROM daily_rewards
        WHERE processed_at >= date_trunc('day', CURRENT_TIMESTAMP)
        AND processed_at < date_trunc('day', CURRENT_TIMESTAMP + interval '1 day')
      `);

      res.status(200).json({
        success: true,
        message: 'Daily rewards processed successfully',
        stats: stats.rows[0]
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing daily rewards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 