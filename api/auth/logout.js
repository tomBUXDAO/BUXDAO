import express from 'express';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

router.post('/', async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Clear all auth cookies with correct settings
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0)
    };

    res.clearCookie('discord_token', cookieOptions);
    res.clearCookie('discord_user', cookieOptions);
    res.clearCookie('discord_state', cookieOptions);
    res.clearCookie('buxdao.sid', cookieOptions);

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

export default router; 