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

    // Clear session
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

    // Clear all auth cookies
    res.clearCookie('buxdao.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.clearCookie('discord_token', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.clearCookie('discord_user', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    res.clearCookie('discord_state', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    // Attempt to revoke Discord token if available
    const cookies = req.headers.cookie ? Object.fromEntries(
      req.headers.cookie.split(';').map(c => {
        const [key, value] = c.trim().split('=');
        return [key, value];
      })
    ) : {};

    if (cookies.discord_token) {
      try {
        await fetch('https://discord.com/api/oauth2/token/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            token: cookies.discord_token,
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET
          })
        });
      } catch (error) {
        console.error('Failed to revoke Discord token:', error);
        // Continue with logout even if token revocation fails
      }
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