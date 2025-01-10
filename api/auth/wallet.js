import pool from '../../config/database.js';

export default async function handler(req, res) {
  // Set CORS headers
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://buxdao.com',
    'https://www.buxdao.com'
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

      return res.status(200).json({
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
    return res.status(500).json({ 
      error: 'Verification failed',
      details: error.message
    });
  }
}