import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const state = crypto.randomBytes(16).toString('hex');
    
    res.setHeader('Set-Cookie', `discord_state=${state}; HttpOnly; ${
      process.env.NODE_ENV === 'production' ? 'Secure; ' : ''
    }SameSite=Lax; Path=/; Domain=${
      process.env.NODE_ENV === 'production' ? '.buxdao.com' : ''
    }; Max-Age=${10 * 60}`);

    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://buxdao.com/api/auth/discord/callback'
      : 'http://localhost:3001/api/auth/discord/callback';

    // Discord's exact format
    const authUrl = 'https://discord.com/oauth2/authorize' +
      '?response_type=code' +
      '&client_id=' + encodeURIComponent(process.env.DISCORD_CLIENT_ID) +
      '&scope=' + encodeURIComponent('identify guilds.join') +
      '&state=' + encodeURIComponent(state) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&prompt=consent';

    res.setHeader('Location', authUrl);
    return res.status(302).end();
  } catch (error) {
    console.error('Discord auth error:', error);
    return res.status(500).json({ error: 'Failed to initiate Discord authentication' });
  }
} 