import axios from 'axios';

export default async function handler(req, res) {
  console.log('[Process] Received request:', {
    method: req.method,
    origin: req.headers.origin,
    body: req.body
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://buxdao.com',
    'https://www.buxdao.com'
  ];

  if (allowedOrigins.includes(origin)) {
    console.log('[Process] Setting CORS headers for origin:', origin);
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
  }

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { code } = req.body;
  if (!code) {
    console.error('[Process] Missing code parameter');
    return res.status(400).json({ error: 'Missing code parameter' });
  }

  try {
    console.log('[Process] Exchanging code for token...');
    // Exchange code for token
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'http://localhost:3001/api/auth/discord/callback'
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('[Process] Token exchange successful');
    const { access_token } = tokenResponse.data;

    // Get user data
    console.log('[Process] Fetching user data...');
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    console.log('[Process] User data fetched successfully');
    const userData = userResponse.data;

    // Set cookies
    console.log('[Process] Setting cookies...');
    res.setHeader('Set-Cookie', [
      `discord_token=${access_token}; HttpOnly; Path=/; SameSite=Lax`,
      `discord_user=${JSON.stringify({
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar
      })}; Path=/; SameSite=Lax`
    ]);

    console.log('[Process] Sending success response');
    return res.status(200).json({
      success: true,
      user: {
        discord_id: userData.id,
        discord_username: userData.username,
        avatar: userData.avatar
      }
    });

  } catch (error) {
    console.error('[Process] Auth process error:', {
      message: error.message,
      response: error.response?.data,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Authentication failed',
      details: error.response?.data || error.message
    });
  }
} 