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
    // Generate random state
    const state = crypto.randomBytes(32).toString('hex');
    
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

    // Set state cookie as backup
    res.cookie('discord_state', state, {
      maxAge: 5 * 60 * 1000, // 5 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    // Build Discord OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds.join',
      state: state
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