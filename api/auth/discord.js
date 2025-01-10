import express from 'express';
import crypto from 'crypto';

const router = express.Router();

router.get('/', (req, res) => {
  // Generate state parameter for security
  const state = crypto.randomBytes(16).toString('hex');
  
  // Set state in cookie for verification
  res.cookie('discord_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 10, // 10 minutes
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined
  });

  // Build OAuth URL
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com/api/auth/discord/callback'
    : 'http://localhost:3001/api/auth/discord/callback';

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds.join',
    state: state
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

export default router; 