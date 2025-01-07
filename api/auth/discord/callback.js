import { Pool } from '@vercel/postgres';

export const config = {
  runtime: 'edge'
};

const DISCORD_API = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:5173/api/auth/discord/callback';

async function getDiscordUser(access_token) {
  const response = await fetch(`${DISCORD_API}/users/@me`, {
    headers: {
      Authorization: `Bearer ${access_token}`,
    },
  });
  return response.json();
}

export default async function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');

    if (!code) {
      return new Response(JSON.stringify({ error: 'No code provided' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Exchange code for token
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token');
    }

    // Get user info
    const userData = await getDiscordUser(tokenData.access_token);

    // Connect to database
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Update or create user in database
    const result = await pool.query(
      `INSERT INTO holders (discord_id, discord_username, last_verified)
       VALUES ($1, $2, NOW())
       ON CONFLICT (discord_id) 
       DO UPDATE SET 
         discord_username = $2,
         last_verified = NOW()
       RETURNING *`,
      [userData.id, `${userData.username}#${userData.discriminator}`]
    );

    // Return success with user data
    return new Response(JSON.stringify({
      success: true,
      user: result.rows[0]
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        // Set session cookie
        'Set-Cookie': `discord_token=${tokenData.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokenData.expires_in}`
      }
    });

  } catch (error) {
    console.error('Discord callback error:', error);
    return new Response(JSON.stringify({ 
      error: 'Authentication failed',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 