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
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log('Discord callback request:', {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        cookies: req.headers.cookie,
        query: req.query,
        retries
      });

      const { code, state } = req.query;
      const cookieState = req.cookies.discord_state;
      const sessionState = req.session?.discord_state;

      // Validate state using either session or cookie
      if (!state || (!sessionState && !cookieState) || (state !== sessionState && state !== cookieState)) {
        console.error('State validation failed:', {
          receivedState: state,
          sessionState,
          cookieState
        });
        return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
      }

      // Clear state
      req.session.discord_state = null;
      res.clearCookie('discord_state');
      await new Promise(resolve => req.session.save(resolve));

      if (!code) {
        console.error('No code received in callback');
        return res.redirect(`${FRONTEND_URL}/verify?error=no_code`);
      }

      // Exchange code for token with retries
      let tokenData;
      let tokenRetries = 3;
      while (tokenRetries > 0) {
        try {
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

          tokenData = await tokenResponse.json();
          break;
        } catch (error) {
          tokenRetries--;
          if (tokenRetries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Get user data with retries
      let userData;
      let userRetries = 3;
      while (userRetries > 0) {
        try {
          const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: {
              'Authorization': `Bearer ${tokenData.access_token}`
            }
          });

          if (!userResponse.ok) {
            const error = await userResponse.text();
            console.error('Failed to get user data:', error);
            throw new Error('Failed to get user data');
          }

          userData = await userResponse.json();
          break;
        } catch (error) {
          userRetries--;
          if (userRetries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Get database connection
      client = await pool.connect();

      // Start transaction
      await client.query('BEGIN');

      // Create or update user record with retries
      let dbRetries = 3;
      while (dbRetries > 0) {
        try {
          await client.query(
            `INSERT INTO user_roles (discord_id, discord_name) 
             VALUES ($1, $2)
             ON CONFLICT (discord_id) 
             DO UPDATE SET discord_name = $2
             RETURNING *`,
            [userData.id, userData.username]
          );
          break;
        } catch (error) {
          dbRetries--;
          if (dbRetries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      await client.query('COMMIT');

      // Store user data in both session and cookies
      const userInfo = {
        discord_id: userData.id,
        discord_username: userData.username,
        avatar: userData.avatar,
        access_token: tokenData.access_token
      };

      // Set session data
      req.session.user = userInfo;
      
      // Set cookies with proper options
      res.cookie('discord_user', JSON.stringify(userInfo), COOKIE_OPTIONS);
      res.cookie('discord_token', tokenData.access_token, COOKIE_OPTIONS);

      // Save session with retry
      let sessionRetries = 3;
      while (sessionRetries > 0) {
        try {
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
          break;
        } catch (error) {
          sessionRetries--;
          if (sessionRetries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Release client and redirect
      if (client) client.release();
      return res.redirect(`${FRONTEND_URL}/verify`);

    } catch (error) {
      console.error('Discord callback error:', {
        error: error.message,
        stack: error.stack,
        sessionID: req.sessionID,
        retries: retries - 1
      });

      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError);
        }
        client.release();
      }

      retries--;
      if (retries === 0) {
        return res.redirect(`${FRONTEND_URL}/verify?error=auth_failed`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
});

export default router; 