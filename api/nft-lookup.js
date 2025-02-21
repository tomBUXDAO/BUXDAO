import express from 'express';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('NFT lookup request received:', {
    body: req.body,
    method: req.method
  });

  try {
    const { collection, tokenId } = req.body;

    if (!collection || !tokenId) {
      console.error('Missing parameters:', { collection, tokenId });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Process NFT lookup
    console.log('Starting NFT lookup process:', { collection, tokenId });
    
    const result = await handleNFTLookup(`${collection}.${tokenId}`);
    console.log('NFT lookup successful:', {
      type: result.type,
      hasEmbed: !!result.data?.embeds,
      embedData: result.data?.embeds?.[0] ? {
        title: result.data.embeds[0].title,
        hasImage: !!result.data.embeds[0].image,
        imageUrl: result.data.embeds[0].image?.url,
        fields: result.data.embeds[0].fields?.length
      } : null
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('NFT lookup error:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router; 