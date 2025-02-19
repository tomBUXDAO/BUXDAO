import express from 'express';
import fetch from 'node-fetch';
import { pool } from '../../../api/config/database.js';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:3001/api/auth/discord/callback';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined,
  maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
};

router.get('/', async (req, res) => {
  let client;
  
  try {
    console.log('Discord callback request:', {
      query: req.query,
      cookies: req.headers.cookie,
      url: req.url,
      headers: req.headers
    });

    const { code, state } = req.query;
    const cookieState = req.cookies?.discord_state;

    // Validate state
    if (!state || !cookieState || state !== cookieState) {
      console.error('State validation failed:', {
        receivedState: state,
        cookieState,
        headers: req.headers
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
    }

    // Clear state cookie immediately
    res.clearCookie('discord_state', {
      ...COOKIE_OPTIONS,
      maxAge: 0
    });

    if (!code) {
      console.error('No code received in callback');
      return res.redirect(`${FRONTEND_URL}/verify?error=no_code`);
    }

    // Exchange code for token
    console.log('Exchanging code for token with URI:', REDIRECT_URI);
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
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error: error,
        headers: tokenResponse.headers
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user data
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const error = await userResponse.text();
      console.error('Failed to get user data:', {
        status: userResponse.status,
        error: error,
        headers: userResponse.headers
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=user_data_failed`);
    }

    const userData = await userResponse.json();
    console.log('User data retrieved successfully');

    // Get database connection
    client = await pool.connect();
    console.log('Database connection established');

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
    console.log('User record updated in database');

    // Store user data in cookies
    const userInfo = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar
    };

    // Set cookies with proper options
    const cookies = [
      ['discord_user', JSON.stringify(userInfo)],
      ['discord_token', tokenData.access_token]
    ];

    cookies.forEach(([name, value]) => {
      res.cookie(name, value, COOKIE_OPTIONS);
    });

    console.log('Cookies set successfully');

    // Release client and redirect
    if (client) {
      client.release();
      console.log('Database connection released');
    }

    console.log('Redirecting to verify page');
    return res.redirect(`${FRONTEND_URL}/verify`);

  } catch (error) {
    console.error('Discord callback error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      headers: req.headers
    });

    if (client) {
      client.release();
      console.log('Database connection released after error');
    }

    // Clear any partially set cookies
    ['discord_state', 'discord_user', 'discord_token'].forEach(name => {
      res.clearCookie(name, {
        ...COOKIE_OPTIONS,
        maxAge: 0
      });
    });

    return res.redirect(`${FRONTEND_URL}/verify?error=auth_failed&details=${encodeURIComponent(error.message)}`);
  }
});

export default router; 