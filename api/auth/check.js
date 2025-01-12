import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Check if user is authenticated via session
    const user = req.session?.user;
    
    if (!user) {
      return res.status(401).json({
        authenticated: false,
        message: 'Not authenticated'
      });
    }

    // Return user data if authenticated
    res.json({
      authenticated: true,
      user: {
        discord_id: user.discord_id,
        discord_username: user.discord_username,
        avatar: user.avatar
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