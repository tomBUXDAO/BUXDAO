import express from 'express';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

const DOMAIN = process.env.NODE_ENV === 'production'
  ? '.buxdao.com'
  : 'localhost';

router.post('/', async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Clear all auth cookies with correct settings for both root and subdomain
    const cookieOptions = {
      path: '/',
      domain: DOMAIN,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0)
    };

    // Clear cookies for root domain
    res.clearCookie('discord_token', cookieOptions);
    res.clearCookie('discord_user', cookieOptions);
    res.clearCookie('discord_state', cookieOptions);
    res.clearCookie('buxdao.sid', cookieOptions);

    // Also clear cookies without domain (for localhost)
    const localCookieOptions = {
      ...cookieOptions,
      domain: undefined
    };
    res.clearCookie('discord_token', localCookieOptions);
    res.clearCookie('discord_user', localCookieOptions);
    res.clearCookie('discord_state', localCookieOptions);
    res.clearCookie('buxdao.sid', localCookieOptions);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message
    });
  }
});

// Handle preflight requests
router.options('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

export default router; 