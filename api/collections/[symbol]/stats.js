import { getClient } from '../../config/database.js';

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

  let client;
  try {
    client = await getClient();
    
    // Get total supply
    const totalSupplyResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1',
      [symbol]
    );
    const totalSupply = totalSupplyResult.rows[0].count;

    // Get listed count
    const listedCountResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1 AND is_listed = TRUE',
      [symbol]
    );
    const listedCount = listedCountResult.rows[0].count;

    // Get floor price from database if available
    const floorPriceResult = await client.query(
      'SELECT MIN(list_price) FROM nft_metadata WHERE symbol = $1 AND is_listed = TRUE',
      [symbol]
    );
    const floorPrice = floorPriceResult.rows[0].min || 0; // Default to 0 if no listed items

    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json({
      totalSupply: parseInt(totalSupply, 10), // Ensure it's a number
      listedCount: parseInt(listedCount, 10), // Ensure it's a number
      floorPrice: floorPrice // floorPrice is already a number or null which we handle
    });
  } catch (error) {
    console.error('Error fetching stats from database:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch stats from database',
      details: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
} 