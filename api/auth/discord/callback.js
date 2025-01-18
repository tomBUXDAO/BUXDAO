import express from 'express';
import fetch from 'node-fetch';
import pool from '../../../config/database.js';

const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:3001/api/auth/discord/callback';
const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

router.get('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { code, state } = req.query;

    // Validate state parameter
    if (!state || !req.session?.discord_state || state !== req.session.discord_state) {
      console.error('State validation failed:', {
        receivedState: state,
        storedState: req.session?.discord_state,
        sessionID: req.sessionID
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
    }

    // Clear state from session
    req.session.discord_state = null;
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!code) {
      return res.redirect(`${FRONTEND_URL}/verify?error=no_code`);
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: CALLBACK_URL
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const tokenData = await tokenResponse.json();

    // Get user data
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user data');
    }

    const userData = await userResponse.json();

    // Start transaction
    await client.query('BEGIN');

    // Create or update user record
    const result = await client.query(
      `INSERT INTO user_roles (discord_id, discord_name) 
       VALUES ($1, $2)
       ON CONFLICT (discord_id) 
       DO UPDATE SET discord_name = $2
       RETURNING *`,
      [userData.id, userData.username]
    );

    await client.query('COMMIT');

    // Store user data in session
    req.session.user = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar,
      access_token: tokenData.access_token
    };

    // Save session
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Redirect to verify page
    res.redirect(`${FRONTEND_URL}/verify`);

  } catch (error) {
    console.error('Discord callback error:', error);
    await client.query('ROLLBACK');
    res.redirect(`${FRONTEND_URL}/verify?error=${encodeURIComponent(error.message)}`);
  } finally {
    client.release();
  }
});

export default router; 