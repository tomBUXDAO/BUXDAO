import express from 'express';
import axios from 'axios';
import pool from '../../config/database.js';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

router.get('/', async (req, res) => {
  console.log('Discord callback request:', {
    sessionID: req.sessionID,
    hasSession: !!req.session,
    state: req.query.state,
    sessionState: req.session?.discord_state,
    cookies: req.headers.cookie
  });

  let client;
  try {
    // Validate state
    const state = req.query.state;
    const storedState = req.session?.discord_state;

    if (!state || !storedState || state !== storedState) {
      console.error('State validation failed:', {
        receivedState: state,
        storedState,
        sessionID: req.sessionID
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
    }

    // Exchange code for token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: req.query.code,
        redirect_uri: process.env.NODE_ENV === 'production'
          ? 'https://buxdao.com/api/auth/discord/callback'
          : 'http://localhost:3001/api/auth/discord/callback'
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    const { access_token } = tokenResponse.data;

    // Get user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    const { id: discord_id, username: discord_username, avatar } = userResponse.data;

    // Store user data in session
    const userData = {
      discord_id,
      discord_username,
      avatar,
      access_token
    };

    req.session.user = userData;
    delete req.session.discord_state; // Clear state after use

    // Save session before database operations
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Failed to save session:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Database operations
    client = await pool.connect();
    await client.query('BEGIN');

    // Update user roles
    const updateQuery = `
      INSERT INTO user_roles (discord_id, discord_name, last_updated)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (discord_id) 
      DO UPDATE SET 
        discord_name = $2,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    await client.query(updateQuery, [discord_id, discord_username]);
    await client.query('COMMIT');

    // Set auth cookies
    res.cookie('discord_token', access_token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined
    });

    res.cookie('discord_user', JSON.stringify(userData), {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined
    });

    // Redirect to verify page
    res.redirect(`${FRONTEND_URL}/verify`);
  } catch (error) {
    console.error('Discord callback error:', {
      error: error.message,
      stack: error.stack,
      sessionID: req.sessionID
    });

    if (client) {
      await client.query('ROLLBACK');
    }

    res.redirect(`${FRONTEND_URL}/verify?error=callback_failed`);
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 