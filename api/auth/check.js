export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://buxdao.com',
    'https://www.buxdao.com'
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cookie');
    res.setHeader('Access-Control-Expose-Headers', 'Set-Cookie');
  }

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
      res.setHeader('Set-Cookie', [
        'discord_token=; HttpOnly; Path=/; Max-Age=0',
        'discord_user=; Path=/; Max-Age=0'
      ]);
      return res.status(401).json({ authenticated: false });
    }

    const userData = await userResponse.json();

    // Return user data
    return res.status(200).json({
      authenticated: true,
      user: {
        discord_id: userData.id,
        discord_username: userData.username,
        avatar: userData.avatar,
      },
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({ error: error.message });
  }
} 