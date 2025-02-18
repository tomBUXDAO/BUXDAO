export default async function handler(req, res) {
  // Set CORS headers
  const origin = process.env.NODE_ENV === 'production' 
    ? ['https://buxdao.com', 'https://www.buxdao.com']
    : ['http://localhost:5173', 'http://localhost:3001'];
  
  const requestOrigin = req.headers.origin;
  if (origin.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control, Pragma');
  }

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol } = req.query;
  console.log('Fetching stats for:', symbol);

  try {
    const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    const data = await response.json();
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: error.message
    });
  }
} 