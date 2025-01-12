import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (
  process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com/api/auth/discord/callback'
    : 'http://localhost:5173/api/auth/discord/callback'
);
const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

router.get('/', async (req, res) => {
  const { code, state } = req.query;

  // Verify state matches
  if (!state || state !== req.session.discord_state) {
    console.error('State mismatch:', { 
      providedState: state, 
      storedState: req.session.discord_state 
    });
    return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
  }

  // Clear stored state
  delete req.session.discord_state;

  if (!code) {
    console.error('No code provided in callback');
    return res.redirect(`${FRONTEND_URL}/verify?error=missing_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return res.redirect(`${FRONTEND_URL}/verify?error=token_exchange`);
    }

    const tokenData = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('User info fetch failed:', errorText);
      return res.redirect(`${FRONTEND_URL}/verify?error=user_info`);
    }

    const userData = await userResponse.json();

    // Store user data in session and cookies
    req.session.user = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar,
      access_token: tokenData.access_token
    };

    // Set cookies for client-side access
    res.cookie('discord_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.cookie('discord_user', JSON.stringify({
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar
    }), {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    // Redirect back to frontend
    res.redirect(`${FRONTEND_URL}/verify?success=true`);
  } catch (error) {
    console.error('Discord callback error:', error);
    res.redirect(`${FRONTEND_URL}/verify?error=server_error`);
  }
});

export default router; 