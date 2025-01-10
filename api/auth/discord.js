import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Generate state parameter for security
    const state = crypto.randomBytes(16).toString('hex');
    
    // Set state in cookie for verification
    res.setHeader('Set-Cookie', `discord_state=${state}; HttpOnly; ${
      process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
    }SameSite=Lax; Path=/; Domain=${
      process.env.NODE_ENV === 'production' ? '.buxdao.com' : ''
    }; Max-Age=${10 * 60}`); // 10 minutes

    // Build OAuth URL
    const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://buxdao.com/api/auth/discord/callback'
      : 'http://localhost:3001/api/auth/discord/callback';

    const params = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify guilds.join',
      state: state,
      prompt: 'consent'
    });

    // Use 302 redirect
    res.setHeader('Location', `https://discord.com/api/oauth2/authorize?${params.toString()}`);
    return res.status(302).end();
  } catch (error) {
    console.error('Discord auth error:', error);
    return res.status(500).json({ error: 'Failed to initiate Discord authentication' });
  }
} 