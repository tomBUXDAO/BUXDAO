import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  const { symbol } = req.query;
  
  try {
    console.log(`Fetching stats for collection: ${symbol}`);
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    return res.status(200).json(response.data);
  } catch (error) {
    console.error(`Error fetching stats for ${symbol}:`, error.message);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
} 