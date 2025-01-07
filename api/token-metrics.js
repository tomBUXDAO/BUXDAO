import { Pool } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Get supply metrics from database
    const result = await pool.query(`
      SELECT 
        SUM(balance) as total_supply,
        SUM(CASE WHEN is_exempt = FALSE THEN balance ELSE 0 END) as public_supply,
        SUM(CASE WHEN is_exempt = TRUE THEN balance ELSE 0 END) as exempt_supply
      FROM bux_holders
    `);

    const metrics = result.rows[0];

    res.status(200).json({
      totalSupply: metrics.total_supply || 0,
      publicSupply: metrics.public_supply || 0,
      exemptSupply: metrics.exempt_supply || 0,
      liquidityPool: 250000,
      tokenValue: 0.12
    });

  } catch (error) {
    console.error('Error fetching token metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await pool.end();
  }
} 