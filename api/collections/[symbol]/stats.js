import { getClient } from '../../config/database.js';
import { getCollectionBySymbol } from '../../config/collections.js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers
  const origin = process.env.NODE_ENV === 'production' 
    ? ['https://buxdao.com', 'https://www.buxdao.com']
    : ['http://localhost:5173', 'http://localhost:3001'];
  
  const requestOrigin = req.headers?.origin;
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

  // Get collection config
  const collection = getCollectionBySymbol(symbol);
  if (!collection) {
    return res.status(404).json({
      error: 'Collection not found',
      details: `No configuration found for symbol: ${symbol}`
    });
  }

  let client;
  try {
    client = await getClient();
    
    // Get total supply
    const totalSupplyResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1',
      [collection.symbol]
    );
    const totalSupply = totalSupplyResult.rows[0].count;

    // Get listed count
    const listedCountResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1 AND is_listed = TRUE',
      [collection.symbol]
    );
    const listedCount = listedCountResult.rows[0].count;

    // Get floor price from Magic Eden
    let floorPrice = 0;
    try {
      const meResponse = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${collection.meSlug}/stats`);
      if (meResponse.ok) {
        const meData = await meResponse.json();
        floorPrice = meData.floorPrice || 0;
      } else {
        console.error(`Failed to fetch floor price from Magic Eden for ${collection.symbol}:`, meResponse.statusText);
      }
    } catch (error) {
      console.error(`Error fetching floor price from Magic Eden for ${collection.symbol}:`, error);
    }

    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json({
      symbol: collection.symbol,
      name: collection.name,
      totalSupply: parseInt(totalSupply, 10),
      listedCount: parseInt(listedCount, 10),
      floorPrice: floorPrice,
      rewardRate: collection.rewardRate
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch stats',
      details: error.message
    });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (error) {
        console.error('Error releasing client:', error);
      }
    }
  }
} 