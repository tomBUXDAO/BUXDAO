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

    // Only use session-based auth
    if (!req.session || !req.session.user || !req.session.user.discord_id) {
      return res.status(401).json({
        authenticated: false,
        message: 'Not authenticated'
      });
    }

    return res.json({
      authenticated: true,
      user: {
        discord_id: req.session.user.discord_id,
        discord_username: req.session.user.discord_username,
        avatar: req.session.user.avatar,
        wallet_address: req.session.user.wallet_address
      }
    });
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({
      authenticated: false,
      message: 'Internal server error'
    });
  }
});

export default router; 