import express from 'express';
import fetch from 'node-fetch';
import pool from '../../../config/database.js';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (
  process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com/api/auth/discord/callback'
    : 'http://localhost:3001/api/auth/discord/callback'
);

router.get('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('Discord callback request:', {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      cookies: req.headers.cookie,
      query: req.query
    });

    const { code, state } = req.query;

    // Validate state parameter
    if (!state || !req.session?.discord_state || state !== req.session.discord_state) {
      console.error('State validation failed:', {
        receivedState: state,
        storedState: req.session?.discord_state,
        sessionID: req.sessionID,
        cookies: req.headers.cookie
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
    }

    // Clear state from session
    req.session.discord_state = null;
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Failed to clear session state:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    if (!code) {
      console.error('No code received in callback');
      return res.redirect(`${FRONTEND_URL}/verify?error=no_code`);
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();

    // Get user data
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to get user data:', await userResponse.text());
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
        if (err) {
          console.error('Failed to save user session:', err);
          reject(err);
        } else {
          console.log('User session saved:', {
            sessionID: req.sessionID,
            discordId: userData.id
          });
          resolve();
        }
      });
    });

    // Redirect to verify page
    res.redirect(`${FRONTEND_URL}/verify`);

  } catch (error) {
    console.error('Discord callback error:', {
      error: error.message,
      stack: error.stack,
      sessionID: req.sessionID
    });
    await client.query('ROLLBACK');
    res.redirect(`${FRONTEND_URL}/verify?error=auth_failed`);
  } finally {
    client.release();
  }
});

export default router; 