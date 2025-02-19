import express from 'express';
import fetch from 'node-fetch';
import { pool } from '../../../api/config/database.js';

const router = express.Router();

// Production URLs
const FRONTEND_URL = 'https://buxdao.com';
const API_URL = 'https://buxdao.com';
const CALLBACK_URL = `${API_URL}/api/auth/discord/callback`;

// Cookie settings for production
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  domain: 'buxdao.com',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
};

router.get('/', async (req, res) => {
  let client;
  
  try {
    const { code, state } = req.query;
    const cookieState = req.cookies?.discord_state;

    // Clear state cookie immediately
    res.clearCookie('discord_state', COOKIE_OPTIONS);

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
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: CALLBACK_URL
      })
    });

    if (!tokenResponse.ok) {
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
      return res.redirect(`${FRONTEND_URL}/verify?error=user_data_failed`);
    }

    const userData = await userResponse.json();

    // Get database connection
    client = await pool.connect();

    // Update user record
    await client.query(
      `INSERT INTO user_roles (discord_id, discord_name) 
       VALUES ($1, $2)
       ON CONFLICT (discord_id) 
       DO UPDATE SET 
         discord_name = $2,
         last_updated = CURRENT_TIMESTAMP`,
      [userData.id, userData.username]
    );

    // Set cookies with explicit options
    const userInfo = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar
    };

    res.cookie('discord_user', JSON.stringify(userInfo), {
      ...COOKIE_OPTIONS,
      secure: true,
      sameSite: 'none'
    });
    res.cookie('discord_token', tokenData.access_token, {
      ...COOKIE_OPTIONS,
      secure: true,
      sameSite: 'none'
    });

    // Release client and redirect
    if (client) client.release();

    // Set headers for redirect
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);

    // Redirect with absolute URL
    return res.redirect('https://buxdao.com/verify');

  } catch (error) {
    console.error('Discord callback error:', error);

    if (client) client.release();

    // Clear cookies on error
    res.clearCookie('discord_state', COOKIE_OPTIONS);
    res.clearCookie('discord_user', COOKIE_OPTIONS);
    res.clearCookie('discord_token', COOKIE_OPTIONS);

    return res.redirect('https://buxdao.com/verify?error=auth_failed');
  }
});

export default router; 