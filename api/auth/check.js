import express from 'express';
import cors from 'cors';

const router = express.Router();

const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3001',
      'https://buxdao.com',
      'https://www.buxdao.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
};

router.get('/', cors(corsOptions), async (req, res) => {
  try {
    const token = req.cookies.discord_token;
    if (!token) {
      return res.status(401).json({ authenticated: false });
    }

    // Verify token with Discord
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userResponse.ok) {
      // Clear invalid token
      res.clearCookie('discord_token', { 
        path: '/',
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production'
      });
      res.clearCookie('discord_user', { 
        path: '/',
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production'
      });
      return res.status(401).json({ authenticated: false });
    }

    const userData = await userResponse.json();

    // Return user data
    res.json({
      authenticated: true,
      user: {
        discord_id: userData.id,
        discord_username: userData.username,
        avatar: userData.avatar,
      },
    });

  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 