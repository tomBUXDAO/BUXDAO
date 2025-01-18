import express from 'express';
import { parse } from 'cookie';
import pool from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  let client;
  try {
    const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
    const discordUser = cookies.discord_user ? JSON.parse(cookies.discord_user) : null;

    if (!discordUser || !discordUser.discord_id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    client = await pool.connect();
    
    // Just get basic user data first
    const result = await client.query(
      'SELECT * FROM user_roles WHERE discord_id = $1',
      [discordUser.discord_id]
    );

    if (!result.rows[0]) {
      return res.status(200).json({ roles: [], holdings: {} });
    }

    const userData = result.rows[0];
    const holdings = {
      fckedCatz: userData.fcked_catz_holder,
      moneyMonsters: userData.money_monsters_holder,
      aiBitbots: userData.ai_bitbots_holder,
      moneyMonsters3d: userData.moneymonsters3d_holder,
      celebCatz: userData.celebcatz_holder
    };

    res.status(200).json({
      roles: userData.roles || [],
      holdings
    });

  } catch (error) {
    console.error('Error in roles endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 