import { pool } from '../config/database.js';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = parse(req.headers.cookie || '');
  const discordUser = cookies.discord_user ? JSON.parse(cookies.discord_user) : null;

  if (!discordUser?.discord_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  let client;
  try {
    client = await pool.connect();
    console.log('Fetching roles for discord_id:', discordUser.discord_id);

    // Get user's roles from user_roles table
    const query = `
      SELECT roles
      FROM user_roles 
      WHERE discord_id = $1
    `;

    const result = await client.query(query, [discordUser.discord_id]);
    console.log('User roles result:', result.rows[0]);

    if (!result.rows[0]) {
      console.log('No roles found for user');
      return res.json({ roles: [] });
    }

    // The roles column is already a JSONB array with all the role information
    const roles = result.rows[0].roles || [];
    console.log('Sending roles:', roles);
    res.json({ roles });

  } catch (error) {
    console.error('Error fetching user roles:', error);
    if (error.position) {
      console.error('Error position:', error.position);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    if (error.hint) {
      console.error('Error hint:', error.hint);
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
} 