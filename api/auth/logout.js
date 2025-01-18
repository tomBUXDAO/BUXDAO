import express from 'express';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

router.post('/', async (req, res) => {
  try {
    console.log('Logout request received:', {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      cookies: req.headers.cookie
    });

    // Destroy session in database first
    if (req.session) {
      await new Promise((resolve, reject) => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    // Clear session cookie with exact same settings as session config
    res.clearCookie('buxdao.sid', {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });

    // Clear other auth cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    };

    res.clearCookie('discord_token', cookieOptions);
    res.clearCookie('discord_user', cookieOptions);
    res.clearCookie('discord_state', cookieOptions);

    // Clear session from store
    if (req.sessionStore) {
      await new Promise((resolve) => {
        req.sessionStore.destroy(req.sessionID, (err) => {
          if (err) {
            console.error('Session store destruction error:', err);
          }
          resolve();
        });
      });
    }

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