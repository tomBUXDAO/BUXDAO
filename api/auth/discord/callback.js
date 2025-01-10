import axios from 'axios';
import pool from '../../../config/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state } = req.query;

  // Verify state parameter
  const storedState = req.cookies.discord_state;
  if (!state || !storedState || state !== storedState) {
    console.error('State verification failed:', { 
      provided: state, 
      stored: storedState 
    });
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://buxdao.com/verify'
      : 'http://localhost:5173/verify';
    return res.redirect(`${redirectUrl}?error=${encodeURIComponent('Invalid state parameter')}`);
  }

  if (!code) {
    console.error('No code provided in callback');
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://buxdao.com/verify'
      : 'http://localhost:5173/verify';
    return res.redirect(`${redirectUrl}?error=${encodeURIComponent('No code provided')}`);
  }

  try {
    // Get the redirect URI from environment or fallback
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://buxdao.com/api/auth/discord/callback'
      : 'http://localhost:3001/api/auth/discord/callback';

    // Exchange code for access token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: 'identify guilds.join',
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, token_type } = tokenResponse.data;

    // Get user data
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        authorization: `${token_type} ${access_token}`,
      },
    });

    const userData = userResponse.data;

    // Add user to server if not already a member
    try {
      await axios.put(
        `https://discord.com/api/guilds/${process.env.DISCORD_GUILD_ID}/members/${userData.id}`,
        {
          access_token
        },
        {
          headers: {
            'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (err) {
      console.log('Error adding user to server:', err.message);
      // Continue even if this fails - they might already be a member
    }

    // Store user data in cookies with proper settings
    const userInfo = {
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar
    };

    // Set cookies with proper security settings
    res.setHeader('Set-Cookie', [
      `discord_token=${access_token}; HttpOnly; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
      
      `discord_user=${JSON.stringify(userInfo)}; ${
        process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
      }SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
      
      'discord_state=; HttpOnly; Path=/; Max-Age=0'
    ]);

    // Check if user exists in database
    try {
      const result = await pool.query(
        'SELECT * FROM user_roles WHERE discord_id = $1',
        [userData.id]
      );

      if (result.rows.length === 0) {
        // Create new user entry
        await pool.query(
          'INSERT INTO user_roles (discord_id, discord_name) VALUES ($1, $2)',
          [userData.id, userData.username]
        );
      } else {
        // Update existing user
        await pool.query(
          'UPDATE user_roles SET discord_name = $1, last_updated = CURRENT_TIMESTAMP WHERE discord_id = $2',
          [userData.username, userData.id]
        );
      }
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      // Continue with the flow even if database operations fail
    }

    // Redirect back to frontend verification page
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://buxdao.com/verify'
      : 'http://localhost:5173/verify';
    
    res.setHeader('Location', frontendUrl);
    return res.status(302).end();

  } catch (error) {
    console.error('Discord callback error:', error);
    
    // Clear cookies on error
    res.setHeader('Set-Cookie', [
      'discord_token=; HttpOnly; Path=/; Max-Age=0',
      'discord_user=; Path=/; Max-Age=0',
      'discord_state=; HttpOnly; Path=/; Max-Age=0'
    ]);

    // Redirect back with error
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? 'https://buxdao.com/verify'
      : 'http://localhost:5173/verify';
    
    const errorMessage = error.response?.data?.error_description || error.message;
    res.setHeader('Location', `${redirectUrl}?error=${encodeURIComponent(errorMessage)}`);
    return res.status(302).end();
  }
} 