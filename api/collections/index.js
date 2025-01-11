import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com'
    : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Content-Type', 'application/json');
  // Disable caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse query parameters
    const url = new URL(req.url, 'http://localhost');
    const collection = url.searchParams.get('collection');
    const endpoint = url.searchParams.get('endpoint');

    console.log('[Collections] Collection:', collection, 'Endpoint:', endpoint);

    if (!collection || !endpoint) {
      return res.status(400).json({ error: 'Missing collection or endpoint' });
    }

    if (endpoint === 'stats') {
      try {
        const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${collection}/stats`);
        if (!response.ok) {
          console.log('[Collections] Magic Eden API returned:', response.status);
          return res.status(200).json({
            floorPrice: 0,
            listedCount: 0,
            avgPrice24hr: 0,
            volumeAll: 0
          });
        }
        const data = await response.json();
        return res.status(200).json(data);
      } catch (error) {
        console.error('[Collections] Error fetching stats:', error);
        return res.status(200).json({
          floorPrice: 0,
          listedCount: 0,
          avgPrice24hr: 0,
          volumeAll: 0
        });
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });
  } catch (error) {
    console.error('[Collections] Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 