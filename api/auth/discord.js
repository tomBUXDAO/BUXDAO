export const config = {
  runtime: 'edge'
};

const DISCORD_API = 'https://discord.com/api/v10';
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com/api/auth/discord/callback'
  : 'http://localhost:5173/api/auth/discord/callback';

export default async function handler(req) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Redirect to Discord OAuth
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds.join'
  });

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${DISCORD_API}/oauth2/authorize?${params.toString()}`,
      'Access-Control-Allow-Origin': '*'
    }
  });
} 