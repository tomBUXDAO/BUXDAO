import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:3001/api/auth/discord/callback';

router.get('/', async (req, res) => {
  try {
    // Generate a random state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Initialize session if it doesn't exist
    if (!req.session) {
      req.session = {};
    }

    // Store state in session
    req.session.discord_state = state;
    
    // Save session explicitly
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Failed to save session:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    console.log('Session state saved:', {
      sessionID: req.sessionID,
      state,
      hasSession: !!req.session,
      secure: req.secure,
      protocol: req.protocol
    });

    // Construct Discord OAuth URL
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      response_type: 'code',
      scope: 'identify guilds',
      state: state
    });

    const redirectUrl = `https://discord.com/api/oauth2/authorize?${params}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Discord auth error:', error);
    res.redirect('/verify?error=' + encodeURIComponent(error.message));
  }
});

export default router; 