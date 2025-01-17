import { parse, serialize } from 'cookie';
import crypto from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Constants
const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://buxdao.com' : 'http://localhost:3001';
const CALLBACK_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:3001/api/auth/discord/callback';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

if (!DISCORD_CLIENT_ID || DISCORD_CLIENT_ID === 'undefined') {
  throw new Error('DISCORD_CLIENT_ID environment variable is not configured');
}

if (!DISCORD_CLIENT_SECRET || DISCORD_CLIENT_SECRET === 'undefined') {
  throw new Error('DISCORD_CLIENT_SECRET environment variable is not configured');
}

// Cookie settings
const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax'
};

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
    // Get the endpoint from the URL path
    const pathParts = req.url.split('/').filter(Boolean);
    const authIndex = pathParts.indexOf('auth');
    const endpoint = pathParts[authIndex + 1]?.split('?')[0];
    
    console.log('[Auth Debug] URL:', req.url);
    console.log('[Auth Debug] Path parts:', pathParts);
    console.log('[Auth Debug] Endpoint:', endpoint);

    if (!endpoint) {
      return res.status(404).json({ error: 'Not found' });
    }

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
      case 'update-wallet':
        return handleWallet(req, res);
      case 'roles':
        const handleRoles = (await import('./roles.js')).default;
        return handleRoles(req, res);
      case 'logout':
        return handleLogout(req, res);
      default:
        console.log('[Auth] No matching endpoint:', endpoint);
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
  try {
    const cookies = parse(req.headers.cookie || '');
    const discordUser = cookies.discord_user ? JSON.parse(cookies.discord_user) : null;

    if (!discordUser) {
      return res.status(200).json({ authenticated: false });
    }

    // Fetch wallet address from database
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT wallet_address FROM user_roles WHERE discord_id = $1',
        [discordUser.discord_id]
      );
      
      const walletAddress = result.rows[0]?.wallet_address;

      return res.status(200).json({ 
        authenticated: true,
        user: {
          ...discordUser,
          wallet_address: walletAddress
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Auth Check] Error:', error);
    return res.status(500).json({ error: 'Failed to check authentication status' });
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
  try {
    // Generate state for security
    const state = crypto.randomBytes(16).toString('hex');
    
    // Set state cookie first
    const stateCookie = `discord_state=${state}; Path=/; Max-Age=300; Secure; HttpOnly`;
    res.setHeader('Set-Cookie', stateCookie);

    // Build Discord OAuth URL with required parameters
    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: CALLBACK_URL,
      response_type: 'code',
      scope: 'identify guilds.join',
      state: state,
      prompt: 'consent'
    });
    
    const discordUrl = `https://discord.com/oauth2/authorize?${params.toString()}`;
    console.log('[Discord Auth] Redirecting to:', discordUrl);

    res.setHeader('Location', discordUrl);
    return res.status(302).end();
  } catch (error) {
    console.error('[Discord Auth] Error:', error);
    res.setHeader('Location', `${ORIGIN}/verify?error=${encodeURIComponent(error.message)}`);
    return res.status(302).end();
  }
}

// Handle Discord callback
async function handleDiscordCallback(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code } = req.query;
    console.log('[Discord Callback] Processing code');
    
    if (!code) {
      console.error('[Discord Callback] No code provided');
      res.setHeader('Location', ORIGIN + '/verify?error=' + encodeURIComponent('No code provided'));
      return res.status(302).end();
    }

    // Exchange code for token
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
        redirect_uri: CALLBACK_URL
      }).toString()
    });

    const tokenText = await tokenResponse.text();
    console.log('[Discord Callback] Token response:', tokenText);

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenText}`);
    }

    const tokenData = JSON.parse(tokenText);
    if (!tokenData.access_token) {
      throw new Error('No access token in response');
    }

    // Get user data
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept': 'application/json'
      }
    });

    if (!userResponse.ok) {
      const userError = await userResponse.text();
      throw new Error(`Failed to get user data: ${userError}`);
    }

    const userData = await userResponse.json();
    console.log('[Discord Callback] Got user data for:', userData.username);

    // Set auth cookies and redirect
    setAuthCookies(res, tokenData.access_token, userData);
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
    console.log('[Wallet Debug] Request body:', req.body);
    
    const cookies = parse(req.headers.cookie || '');
    console.log('[Wallet Debug] Cookies:', cookies);
    
    if (!cookies.discord_user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = JSON.parse(cookies.discord_user);
    console.log('[Wallet Debug] User data:', user);

    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'Missing wallet_address' });
    }

    if (!user.discord_id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Update database
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      console.log('[Wallet Debug] Updating user_roles for discord_id:', user.discord_id);
      
      const result = await client.query(
        'UPDATE user_roles SET wallet_address = $1, last_updated = CURRENT_TIMESTAMP WHERE discord_id = $2 RETURNING *',
        [wallet_address, user.discord_id]
      );

      if (result.rowCount === 0) {
        console.log('[Wallet Debug] No existing user_roles entry, creating new one');
        // Insert if no update was made
        await client.query(
          'INSERT INTO user_roles (wallet_address, discord_id, discord_username) VALUES ($1, $2, $3)',
          [wallet_address, user.discord_id, user.discord_username]
        );
      }

      await client.query('COMMIT');
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Wallet Debug] Database error:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[Wallet Debug] Error:', error);
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
function setAuthCookies(res, token, user) {
  const oneWeek = 7 * 24 * 60 * 60;
  const cookieOptions = 'Path=/; Max-Age=' + oneWeek + '; Secure; SameSite=Lax';

  const tokenCookie = `discord_token=${token}; ${cookieOptions}`;
  const userCookie = `discord_user=${JSON.stringify(user)}; ${cookieOptions}`;

  console.log('[Auth] Setting cookies with options:', cookieOptions);
  res.setHeader('Set-Cookie', [tokenCookie, userCookie]);
}

function clearAuthCookies(res) {
  const cookies = [
    'discord_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'discord_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'discord_state=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ];

  console.log('[Auth] Clearing cookies:', cookies);
  res.setHeader('Set-Cookie', cookies);
} 