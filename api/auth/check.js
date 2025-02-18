import express from 'express';
import { parse } from 'cookie';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

router.get('/', async (req, res) => {
  try {
    // Set CORS headers
    const origin = process.env.NODE_ENV === 'production' 
      ? ['https://buxdao.com', 'https://www.buxdao.com']
      : ['http://localhost:5173', 'http://localhost:3001'];
    
    const requestOrigin = req.headers.origin;
    if (origin.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }

    console.log('Auth check request:', {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      cookies: req.headers.cookie
    });

    // Check for discord_user cookie
    const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
    const discordUser = cookies.discord_user ? JSON.parse(cookies.discord_user) : null;

    if (!discordUser || !discordUser.discord_id) {
      return res.status(401).json({
        authenticated: false,
        message: 'Not authenticated'
      });
    }

    // Get wallet address from database
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT wallet_address FROM user_roles WHERE discord_id = $1',
        [discordUser.discord_id]
      );

      return res.json({
        authenticated: true,
        user: {
          discord_id: discordUser.discord_id,
          discord_username: discordUser.discord_username,
          avatar: discordUser.avatar,
          wallet_address: result.rows[0]?.wallet_address
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      authenticated: false,
      message: 'Internal server error'
    });
  }
});

export default router; 