import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Handle collection stats endpoint
router.get('/:collection/stats', async (req, res) => {
  try {
    const collection = req.params.collection;
    console.log('[Collections] Fetching stats for collection:', collection);

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
  } catch (error) {
    console.error('[Collections] Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router; 