import express from 'express';
import fetch from 'node-fetch';
import pg from 'pg';

const router = express.Router();
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

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

  // Verify state matches (check both session and cookies)
  const sessionState = req.session.discord_state;
  const cookieState = req.cookies.discord_state;

  if (!state || (!sessionState && !cookieState) || (state !== sessionState && state !== cookieState)) {
    console.error('State mismatch:', { 
      providedState: state, 
      sessionState,
      cookieState
    });
    return res.redirect(`${FRONTEND_URL}/verify?error=invalid_state`);
  }

  // Clear stored states
  delete req.session.discord_state;
  res.clearCookie('discord_state', { path: '/' });

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

    // Create or update user_roles entry
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          `INSERT INTO user_roles (
            discord_id, 
            discord_name,
            wallet_address,
            fcked_catz_holder,
            money_monsters_holder,
            moneymonsters3d_holder,
            ai_bitbots_holder,
            celebcatz_holder,
            fcked_catz_whale,
            money_monsters_whale,
            moneymonsters3d_whale,
            ai_bitbots_whale,
            bux_beginner,
            bux_builder,
            bux_saver,
            bux_banker,
            buxdao_5
          )
          VALUES ($1, $2, NULL, false, false, false, false, false, false, false, false, false, false, false, false, false, false)
          ON CONFLICT (discord_id) 
          DO UPDATE SET discord_name = $2
          RETURNING *`,
          [userData.id, userData.username]
        );
        console.log('Created/updated user_roles entry:', result.rows[0]);
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('Database error creating user_roles entry:', dbError);
      // Continue with auth flow even if DB fails
    }

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