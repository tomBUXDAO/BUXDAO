import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

const DOMAIN = process.env.NODE_ENV === 'production'
  ? '.buxdao.com'
  : 'localhost';

router.post('/', async (req, res) => {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', FRONTEND_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');

  const client = await pool.connect();
  try {
    // Delete session from database first
    await client.query('DELETE FROM "session" WHERE sid = $1', [req.sessionID]);

    // Destroy express session
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction failed:', err);
          reject(err);
        }
        resolve();
      });
    });

    // Clear all cookies with proper options for both secure and non-secure environments
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? '.buxdao.com' : undefined,
      maxAge: 0
    };

    // List of known cookies to clear
    const cookiesToClear = [
      'discord_user',
      'discord_token',
      'discord_state',
      'auth_status',
      'buxdao.sid',
      'connect.sid'
    ];

    // Clear specific cookies
    cookiesToClear.forEach(cookieName => {
      res.clearCookie(cookieName, {
        ...cookieOptions,
        // Also try without domain for some cookies
        domain: undefined
      });
      // Try with explicit domain
      res.clearCookie(cookieName, cookieOptions);
    });

    // Also clear any other cookies present
    if (req.cookies) {
      for (const cookieName in req.cookies) {
        if (cookieName && !cookiesToClear.includes(cookieName)) {
          res.clearCookie(cookieName, {
            ...cookieOptions,
            domain: undefined
          });
          res.clearCookie(cookieName, cookieOptions);
        }
      }
    }

    // Send response with cache control headers
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  } finally {
    client.release();
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