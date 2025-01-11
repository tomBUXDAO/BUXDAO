export default async function handler(req, res) {
  // Set CORS headers first
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:5173',
    'https://buxdao.com',
    'https://www.buxdao.com'
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  }

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const token = req.cookies.discord_token;
    
    if (token) {
      // Revoke the Discord token
      try {
        const revokeResponse = await fetch('https://discord.com/api/oauth2/token/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            token: token,
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
          })
        });
        
        if (!revokeResponse.ok) {
          console.error('Discord token revocation failed:', await revokeResponse.text());
        }
      } catch (error) {
        console.error('Error revoking Discord token:', error);
        // Continue with logout even if token revocation fails
      }
    }

    // Clear cookies
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      domain: isProduction ? '.buxdao.com' : undefined,
      expires: new Date(0)
    };

    const cookieString = Object.entries(cookieOptions)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    // Set cookies first
    res.setHeader('Set-Cookie', [
      `discord_token=; ${cookieString}`,
      `discord_user=; ${cookieString}`,
      `discord_state=; ${cookieString}`
    ]);

    // Then send JSON response
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Logout error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Logout failed', details: error.message }));
  }
} 