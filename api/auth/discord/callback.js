import express from 'express';
import fetch from 'node-fetch';
import { pool } from '../../../api/config/database.js';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (
  process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com/api/auth/discord/callback'
    : 'http://localhost:3001/api/auth/discord/callback'
);

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
};

router.get('/', async (req, res) => {
  let client;
  
  try {
    console.log('Discord callback request:', {
      query: req.query,
      cookies: req.headers.cookie
    });

    const { code, state } = req.query;
    const cookieState = req.cookies.discord_state;

    // Validate state
    if (!state || !cookieState || state !== cookieState) {
      console.error('State validation failed:', {
        receivedState: state,
        cookieState
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
    }

    // Clear state cookie
    res.clearCookie('discord_state', COOKIE_OPTIONS);

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
      return res.redirect(`${FRONTEND_URL}/verify?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get user data
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const error = await userResponse.text();
      console.error('Failed to get user data:', error);
      return res.redirect(`${FRONTEND_URL}/verify?error=user_data_failed`);
    }

    const userData = await userResponse.json();

    // Get database connection
    client = await pool.connect();

    // Upsert user record in a single query
    await client.query(
      `INSERT INTO user_roles (discord_id, discord_name) 
       VALUES ($1, $2)
       ON CONFLICT (discord_id) 
       DO UPDATE SET 
         discord_name = $2,
         last_updated = CURRENT_TIMESTAMP
       RETURNING *`,
      [userData.id, userData.username]
    );

    // Store user data in cookies
    const userInfo = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar
    };

    // Set cookies with proper options
    res.cookie('discord_user', JSON.stringify(userInfo), COOKIE_OPTIONS);
    res.cookie('discord_token', tokenData.access_token, COOKIE_OPTIONS);

    // Release client and redirect
    if (client) client.release();
    return res.redirect(`${FRONTEND_URL}/verify`);

  } catch (error) {
    console.error('Discord callback error:', {
      error: error.message,
      stack: error.stack
    });

    if (client) client.release();
    return res.redirect(`${FRONTEND_URL}/verify?error=auth_failed`);
  }
});

export default router; 