import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Collection stats endpoint
router.get('/:symbol/stats', async (req, res) => {
  const { symbol } = req.params;
  console.log('Fetching stats for:', symbol);

  try {
    const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    if (!response.ok) {
      // Return default stats if Magic Eden API fails
      return res.status(200).json({
        floorPrice: 0,
        listedCount: 0,
        avgPrice24hr: 0,
        volumeAll: 0
      });
    }
    const data = await response.json();
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching stats:', error);
    // Return default stats on error
    return res.status(200).json({
      floorPrice: 0,
      listedCount: 0,
      avgPrice24hr: 0,
      volumeAll: 0
    });
  }
});

// Collection image endpoint
router.get('/:symbol/image', async (req, res) => {
  const { symbol } = req.params;

  try {
    const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}`);
    const data = await response.json();
    
    res.status(200).json({ image: data.image });
  } catch (error) {
    console.error('Error fetching collection image:', error);
    res.status(500).json({ error: 'Failed to fetch collection image' });
  }
});

export default router; 