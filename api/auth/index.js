import { parse, serialize } from 'cookie';
import crypto from 'crypto';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Constants
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://buxdao.com' : 'http://localhost:3001';
const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:3001/api/auth/discord/callback';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Content-Type', 'application/json');
  // Disable caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  try {
    // Get the endpoint from the last part of the path
    const endpoint = req.url.split('/').filter(Boolean).pop()?.split('?')[0] || '';
    console.log('[Auth] Request URL:', req.url);
    console.log('[Auth] Endpoint:', endpoint);

    switch(endpoint) {
      case 'check':
        return handleCheck(req, res);
      case 'process':
        return handleProcess(req, res);
      case 'discord':
        return handleDiscordAuth(req, res);
      case 'callback':
        return handleDiscordCallback(req, res);
      case 'wallet':
        return handleWallet(req, res);
      case 'logout':
        return handleLogout(req, res);
      default:
        console.log('[Auth] No matching endpoint for:', endpoint);
        return res.status(404).json({ error: 'Not found' });
    }
  } catch (error) {
    console.error('[Auth] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      url: req.url
    });
  }
}

// Check auth status
async function handleCheck(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('[Auth Check] Request headers:', req.headers);
    const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
    console.log('[Auth Check] Parsed cookies:', cookies);
    
    if (!cookies.discord_token || !cookies.discord_user) {
      console.log('[Auth Check] Missing token or user');
      return res.status(401).json({ 
        authenticated: false,
        error: 'Not authenticated' 
      });
    }

    // Verify Discord token is still valid
    try {
      const response = await fetch('https://discord.com/api/users/@me', {
        headers: {
          'Authorization': `Bearer ${cookies.discord_token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.log('[Auth Check] Invalid token response:', response.status);
        clearAuthCookies(res);
        return res.status(401).json({ 
          authenticated: false,
          error: 'Invalid token' 
        });
      }

      const discordData = await response.json();
      console.log('[Auth Check] Discord API response:', discordData);

      let user;
      try {
        user = JSON.parse(cookies.discord_user);
        console.log('[Auth Check] Parsed user data successfully:', user.id);
        
        // Update user data if needed
        if (user.id !== discordData.id) {
          console.log('[Auth Check] User ID mismatch, updating cookie');
          setAuthCookies(res, cookies.discord_token, discordData);
          user = discordData;
        }
      } catch (e) {
        console.error('[Auth Check] Failed to parse user data:', e);
        clearAuthCookies(res);
        return res.status(401).json({ 
          authenticated: false,
          error: 'Invalid user data' 
        });
      }

      return res.status(200).json({ 
        authenticated: true,
        user
      });
    } catch (error) {
      console.error('[Auth Check] Discord API error:', error);
      return res.status(500).json({ 
        authenticated: false,
        error: 'Failed to verify with Discord',
        details: error.message
      });
    }
  } catch (error) {
    console.error('[Auth Check] Unexpected error:', error);
    return res.status(500).json({ 
      authenticated: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Process auth
async function handleProcess(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'No code provided' });
    }

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: ORIGIN + '/verify',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to get token from Discord');
    }

    const tokenData = await tokenResponse.json();
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user data from Discord');
    }

    const userData = await userResponse.json();
    setAuthCookies(res, tokenData.access_token, userData);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Auth process error:', error);
    return res.status(500).json({ error: 'Failed to process authentication' });
  }
}

// Initiate Discord auth
async function handleDiscordAuth(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const state = crypto.randomBytes(16).toString('hex');
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5
    };

    // Use the exact Discord OAuth URL
    const discordUrl = `https://discord.com/oauth2/authorize?response_type=code&client_id=${DISCORD_CLIENT_ID}&scope=identify%20guilds.join&state=${state}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&prompt=consent`;
    
    console.log('[Discord Auth] Redirecting to:', discordUrl);

    // Set state cookie and redirect
    res.setHeader('Set-Cookie', serialize('discord_state', state, cookieOptions));
    res.setHeader('Location', discordUrl);
    res.status(302).end();
  } catch (error) {
    console.error('[Discord Auth] Error:', error);
    res.setHeader('Location', ORIGIN + '/verify?error=' + encodeURIComponent(error.message));
    res.status(302).end();
  }
}

// Handle Discord callback
async function handleDiscordCallback(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.query;
    
    if (!code) {
      console.error('[Discord Callback] No code provided');
      res.setHeader('Location', ORIGIN + '/verify?error=' + encodeURIComponent('No code provided'));
      return res.status(302).end();
    }

    console.log('[Discord Callback] Exchanging code for token...');
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: CALLBACK_URL,
      }).toString()
    });

    const responseText = await tokenResponse.text();
    console.log('[Discord Callback] Token response:', responseText);

    if (!tokenResponse.ok) {
      throw new Error(`Failed to get token from Discord: ${responseText}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      console.error('[Discord Callback] Failed to parse token response:', e);
      throw new Error('Invalid token response from Discord');
    }

    console.log('[Discord Callback] Got token, fetching user data...');
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const userResponseText = await userResponse.text();
      console.error('[Discord Callback] User data fetch failed:', userResponseText);
      throw new Error('Failed to get user data from Discord');
    }

    const userData = await userResponse.json();
    console.log('[Discord Callback] Got user data, setting cookies...');

    setAuthCookies(res, tokenData.access_token, userData);

    // Redirect back to verify page
    res.setHeader('Location', ORIGIN + '/verify');
    return res.status(302).end();
  } catch (error) {
    console.error('[Discord Callback] Error:', error);
    res.setHeader('Location', ORIGIN + '/verify?error=' + encodeURIComponent(error.message));
    return res.status(302).end();
  }
}

// Handle wallet verification
async function handleWallet(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress, discord_id, discord_username } = req.body;

    if (!walletAddress || !discord_id || !discord_username) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Update database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(
        'INSERT INTO holders (wallet_address, discord_id, discord_username, last_verified) VALUES ($1, $2, $3, NOW()) ON CONFLICT (wallet_address) DO UPDATE SET discord_id = $2, discord_username = $3, last_verified = NOW() RETURNING *',
        [walletAddress, discord_id, discord_username]
      );

      await client.query('COMMIT');
      return res.status(200).json(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Wallet verification error:', error);
    return res.status(500).json({ error: 'Failed to verify wallet' });
  }
}

// Handle logout
async function handleLogout(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const discordToken = cookies.discord_token;

    if (discordToken) {
      try {
        // Attempt to revoke Discord token
        await fetch('https://discord.com/api/oauth2/token/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            token: discordToken,
            client_id: DISCORD_CLIENT_ID,
            client_secret: DISCORD_CLIENT_SECRET,
          })
        });
      } catch (error) {
        console.error('Failed to revoke Discord token:', error);
      }
    }

    clearAuthCookies(res);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Failed to logout' });
  }
}

// Helper functions
function setAuthCookies(res, token, userData) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : 'localhost',
  };

  res.setHeader('Set-Cookie', [
    serialize('discord_token', token, cookieOptions),
    serialize('discord_user', JSON.stringify({
      discord_id: userData.id,
      discord_username: userData.username,
      avatar: userData.avatar,
    }), cookieOptions),
  ]);
}

function clearAuthCookies(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : 'localhost',
    maxAge: 0,
  };

  res.setHeader('Set-Cookie', [
    serialize('discord_token', '', cookieOptions),
    serialize('discord_user', '', cookieOptions),
    serialize('discord_state', '', cookieOptions),
  ]);
} 