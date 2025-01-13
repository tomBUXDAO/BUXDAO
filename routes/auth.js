import express from 'express';
import { validateState, initDiscordAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/discord', initDiscordAuth, (req, res) => {
  const { DISCORD_CLIENT_ID } = process.env;
  const redirectUri = `${process.env.BASE_URL}/api/auth/discord/callback`;
  const state = req.session.discordState;
  
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify',
    state: state
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

router.get('/discord/callback', validateState, async (req, res) => {
  // ... existing callback logic ...
});

// ... rest of the routes ... 