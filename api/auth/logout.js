import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/',
  domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined,
  expires: new Date(0)
};

router.post('/', async (req, res) => {
  console.log('Logout request received:', {
    sessionID: req.sessionID,
    cookies: req.cookies,
    headers: req.headers
  });

  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');

  try {
    // Clear all cookies first
    const cookiesToClear = [
      'discord_user',
      'discord_token',
      'discord_state',
      'auth_status',
      'buxdao.sid',
      'connect.sid'
    ];

    cookiesToClear.forEach(cookieName => {
      // Clear with domain
      res.clearCookie(cookieName, {
        ...COOKIE_OPTIONS
      });
      // Clear without domain
      res.clearCookie(cookieName, {
        ...COOKIE_OPTIONS,
        domain: undefined
      });
    });

    // Try to delete session from database
    let client;
    try {
      client = await pool.connect();
      await client.query('DELETE FROM "session" WHERE sid = $1', [req.sessionID]);
    } catch (dbError) {
      console.error('Database error during logout:', dbError);
      // Continue with logout even if database operation fails
    } finally {
      if (client) {
        client.release();
      }
    }

    // Destroy express session
    if (req.session) {
      await new Promise((resolve) => {
        req.session.destroy((err) => {
          if (err) {
            console.error('Session destruction error:', err);
          }
          resolve();
        });
      });
    }

    // Send response with cache control headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    console.log('Logout successful:', {
      sessionID: req.sessionID,
      clearedCookies: cookiesToClear
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still try to clear cookies even if there was an error
    res.clearCookie('discord_user');
    res.clearCookie('discord_token');
    res.clearCookie('discord_state');
    res.clearCookie('buxdao.sid');
    res.clearCookie('connect.sid');
    res.status(200).json({ success: true });
  }
});

// Handle preflight requests
router.options('/', (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
  res.status(200).end();
});

export default router; 