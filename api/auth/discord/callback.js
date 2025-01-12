import express from 'express';
import fetch from 'node-fetch';
import pg from 'pg';
import { syncUserRoles } from '../../discord/roles.js';

const router = express.Router();
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const DISCORD_API = 'https://discord.com/api/v10';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

router.get('/', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Verify state matches
    if (!req.session.oauth2state || state !== req.session.oauth2state) {
      return res.status(400).json({
        success: false,
        message: 'Invalid state parameter'
      });
    }

    // Exchange code for token
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text());
      return res.status(400).json({
        success: false,
        message: 'Failed to exchange code for token'
      });
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('User info fetch failed:', await userResponse.text());
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch user info'
      });
    }

    const userData = await userResponse.json();

    // Store user data in session
    req.session.user = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar
    };

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update or insert user_roles
      const userRolesResult = await client.query(
        `INSERT INTO user_roles (discord_id, discord_name)
         VALUES ($1, $2)
         ON CONFLICT (discord_id) 
         DO UPDATE SET 
           discord_name = $2,
           last_updated = CURRENT_TIMESTAMP
         RETURNING *`,
        [userData.id, userData.username]
      );

      // Sync Discord roles
      await syncUserRoles(userData.id, DISCORD_GUILD_ID);

      await client.query('COMMIT');

      // Redirect to verify page
      res.redirect('/verify');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Discord callback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router; 