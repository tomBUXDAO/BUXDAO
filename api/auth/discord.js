import express from 'express';
import crypto from 'crypto';

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
  try {
    console.log('Discord auth request:', {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      cookies: req.headers.cookie
    });

    // Generate random state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Initialize session if it doesn't exist
    if (!req.session) {
      req.session = {};
    }

    // Clear any existing auth data but keep the session
    delete req.session.user;
    delete req.session.discord_state;
    
    // Store state in session
    req.session.discord_state = state;
    
    // Force session save before redirect
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Failed to save session state:', err);
          reject(err);
        } else {
          console.log('Session state saved successfully:', {
            sessionID: req.sessionID,
            state,
            hasSession: !!req.session
          });
          resolve();
        }
      });
    });

    // Build Discord OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds.join',
      state: state,
      prompt: 'consent'
    });

    console.log('Redirecting to Discord with params:', {
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state,
      sessionID: req.sessionID
    });

    // Redirect to Discord OAuth
    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  } catch (error) {
    console.error('Discord auth error:', error);
    res.redirect(`${FRONTEND_URL}/verify?error=auth_failed`);
  }
});

export default router; 