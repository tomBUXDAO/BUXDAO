import express from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (
  process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com/api/auth/discord/callback'
    : 'http://localhost:5173/api/auth/discord/callback'
);

// Validate required environment variables
if (!DISCORD_CLIENT_ID) {
  console.error('DISCORD_CLIENT_ID environment variable is not set');
  throw new Error('DISCORD_CLIENT_ID environment variable is not set');
}

console.log('Discord auth configuration:', {
  DISCORD_CLIENT_ID,
  REDIRECT_URI,
  NODE_ENV: process.env.NODE_ENV
});

router.get('/', async (req, res) => {
  const scopes = ['identify', 'guilds.join'];
  
  // Generate a cryptographically secure state
  const state = crypto.randomBytes(16).toString('hex');
  
  // Store state in session and save immediately
  req.session.discord_state = state;
  
  console.log('Setting Discord state:', {
    sessionID: req.sessionID,
    state: state,
    hasSession: !!req.session
  });

  // Force session save
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
  
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes.join(' '),
    state: state,
    prompt: 'consent'
  });

  console.log('Redirecting to Discord with params:', {
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state: state,
    sessionID: req.sessionID
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

export default router; 