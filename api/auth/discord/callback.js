import express from 'express';
import fetch from 'node-fetch';
import pool from '../../../config/database.js';

const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v9';
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;
const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';
const REDIRECT_URI = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:3001/api/auth/discord/callback';

router.get('/', async (req, res) => {
  let client;
  try {
    const { code, state } = req.query;
    console.log('Discord callback received:', {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      sessionState: req.session?.discord_state,
      receivedState: state,
      code: !!code
    });

    // Ensure session exists
    if (!req.session) {
      console.error('No session found:', {
        sessionID: req.sessionID,
        cookies: req.headers.cookie
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=no_session`);
    }

    // Get state from session
    const sessionState = req.session.discord_state;

    // Validate state
    if (!state || !sessionState || state !== sessionState) {
      console.error('State validation failed:', {
        sessionState,
        receivedState: state,
        sessionID: req.sessionID
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
    }

    // Clear state from session
    delete req.session.discord_state;

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
        redirect_uri: REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error: errorText
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User info fetch failed:', {
        status: userResponse.status,
        error: errorText
      });
      return res.redirect(`${FRONTEND_URL}/verify?error=user_info_failed`);
    }

    const userData = await userResponse.json();
    console.log('User info fetched:', { id: userData.id, username: userData.username });

    // Prepare user data
    const user = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar,
      access_token: tokenData.access_token
    };

    // Store user data in session
    req.session.user = user;

    // Set auth cookies
    res.cookie('discord_token', tokenData.access_token, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.cookie('discord_user', JSON.stringify(user), {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    // Get database connection
    client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update or insert user_roles
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

      await client.query('COMMIT');
      console.log('Database transaction completed successfully');

      // Save session before redirect
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save session before redirect:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      res.redirect(`${FRONTEND_URL}/verify`);
    } catch (dbError) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Database operation failed:', {
        error: dbError.message,
        stack: dbError.stack,
        code: dbError.code
      });
      
      res.redirect(`${FRONTEND_URL}/verify?error=database_error`);
    }
  } catch (error) {
    console.error('Unexpected error:', {
      error: error.message,
      stack: error.stack
    });
    res.redirect(`${FRONTEND_URL}/verify?error=server_error`);
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 