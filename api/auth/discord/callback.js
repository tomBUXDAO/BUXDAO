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
  // Add CORS headers
  res.header('Access-Control-Allow-Origin', 'https://buxdao.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  console.log('Discord callback received:', { 
    state: req.query.state,
    hasCode: !!req.query.code,
    sessionState: req.session?.discord_state,
    cookies: req.headers.cookie
  });
  
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      console.error('Missing required parameters:', { code: !!code, state: !!state });
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Verify state matches
    if (!req.session?.discord_state || state !== req.session.discord_state) {
      console.error('State mismatch or missing session:', {
        sessionExists: !!req.session,
        sessionState: req.session?.discord_state,
        receivedState: state
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid state parameter or session expired'
      });
    }

    // Clear the state after verification
    delete req.session.discord_state;

    console.log('Exchanging code for token...', {
      clientId: process.env.DISCORD_CLIENT_ID,
      redirectUri: process.env.DISCORD_REDIRECT_URI
    });

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
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        error: errorText,
        redirectUri: process.env.DISCORD_REDIRECT_URI
      });
      return res.status(400).json({
        success: false,
        message: 'Failed to exchange code for token',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user info
    console.log('Fetching user info...');
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
      return res.status(400).json({
        success: false,
        message: 'Failed to fetch user info',
        details: process.env.NODE_ENV === 'development' ? errorText : undefined
      });
    }

    const userData = await userResponse.json();
    console.log('User info fetched:', {
      id: userData.id,
      username: userData.username
    });

    // Store user data in session
    if (!req.session) {
      console.error('No session available for storing user data');
      return res.status(500).json({
        success: false,
        message: 'Session unavailable'
      });
    }

    req.session.user = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar,
      access_token: tokenData.access_token
    };

    const client = await pool.connect();
    try {
      console.log('Starting database transaction...');
      await client.query('BEGIN');

      // Update or insert user_roles
      console.log('Updating user_roles...');
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
      console.log('User roles updated:', userRolesResult.rows[0]);

      // Sync Discord roles
      console.log('Syncing Discord roles...');
      const syncResult = await syncUserRoles(userData.id, DISCORD_GUILD_ID);
      console.log('Role sync result:', { success: syncResult });

      await client.query('COMMIT');
      console.log('Transaction committed');

      // Redirect to verify page
      console.log('Redirecting to verify page...');
      res.redirect('/verify');
    } catch (error) {
      console.error('Database transaction failed:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Discord callback error:', {
      message: error.message,
      stack: error.stack,
      sessionExists: !!req.session
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router; 