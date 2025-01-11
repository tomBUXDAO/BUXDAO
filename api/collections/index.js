import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com'
    : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse the URL to get symbol and endpoint
  const urlParts = req.url.split('/');
  const symbol = urlParts[1];  // collections/[symbol]/stats or /image
  const endpoint = urlParts[2]; // 'stats' or 'image'

  if (endpoint === 'stats') {
    try {
      const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
      if (!response.ok) {
        return res.status(200).json({
          floorPrice: 0,
          listedCount: 0,
          avgPrice24hr: 0,
          volumeAll: 0
        });
      }
      const data = await response.json();
      
      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      return res.status(200).json({
        floorPrice: 0,
        listedCount: 0,
        avgPrice24hr: 0,
        volumeAll: 0
      });
    }
  }

  if (endpoint === 'image') {
    try {
      const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}`);
      const data = await response.json();
      
      return res.status(200).json({ image: data.image });
    } catch (error) {
      console.error('Error fetching collection image:', error);
      return res.status(500).json({ error: 'Failed to fetch collection image' });
    }
  }

  return res.status(404).json({ error: 'Endpoint not found' });
} 