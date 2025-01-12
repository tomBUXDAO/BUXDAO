import express from 'express';
import dotenv from 'dotenv';

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

router.get('/', (req, res) => {
  const scopes = ['identify', 'guilds.join'];
  
  // Use provided state or generate one
  const state = req.query.state || Math.random().toString(36).substring(2);
  
  // Store state in session
  req.session.discord_state = state;
  
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
    state: state
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

export default router; 