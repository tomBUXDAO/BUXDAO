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
    // Get top 5 holders by balance
    const result = await pool.query(`
      SELECT 
        wallet_address as address,
        balance as amount,
        ROUND((balance * 100.0 / (SELECT SUM(balance) FROM bux_holders)), 2) as percentage
      FROM bux_holders 
      ORDER BY balance DESC 
      LIMIT 5
    `);

    // Format the data
    const holders = result.rows.map(holder => ({
      address: holder.address,
      amount: Number(holder.amount).toLocaleString(),
      percentage: holder.percentage + '%'
    }));

    res.status(200).json({ holders });

  } catch (error) {
    console.error('Error fetching top holders:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await pool.end();
  }
}
