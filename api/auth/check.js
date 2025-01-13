import express from 'express';
import { parse } from 'cookie';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    console.log('Auth check request:', {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      sessionUser: req.session?.user,
      cookies: req.headers.cookie
    });

    // First try session-based auth
    if (req.session?.user) {
      return res.json({
        authenticated: true,
        user: {
          discord_id: req.session.user.discord_id,
          discord_username: req.session.user.discord_username,
          avatar: req.session.user.avatar,
          wallet_address: req.session.user.wallet_address
        }
      });
    }

    // Fallback to cookie-based auth
    const cookies = parse(req.headers.cookie || '');
    
    if (!cookies.discord_user) {
      return res.status(401).json({
        authenticated: false,
        message: 'Not authenticated'
      });
    }

    try {
      const userData = JSON.parse(cookies.discord_user);
      
      // Store user data in session for future requests
      req.session.user = userData;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Failed to save session:', err);
            reject(err);
          } else {
            resolve();
          }
        });
      });

      return res.json({
        authenticated: true,
        user: {
          discord_id: userData.discord_id,
          discord_username: userData.discord_username,
          avatar: userData.avatar,
          wallet_address: userData.wallet_address
        }
      });
    } catch (parseError) {
      console.error('Failed to parse user cookie:', parseError);
      return res.status(401).json({
        authenticated: false,
        message: 'Invalid user data'
      });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      authenticated: false,
      message: 'Internal server error'
    });
  }
});

export default router; 