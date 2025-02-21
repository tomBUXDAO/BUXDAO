import express from 'express';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { collection, tokenId } = req.body;
    console.log('NFT lookup request:', { collection, tokenId });

    if (!collection || !tokenId) {
      console.error('Missing required parameters:', { collection, tokenId });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const lookupCommand = `${collection}.${tokenId}`;
    console.log('Executing NFT lookup with command:', lookupCommand);
    
    const result = await handleNFTLookup(lookupCommand);
    
    // Log the full result for debugging
    console.log('NFT lookup result:', JSON.stringify(result, null, 2));

    if (!result?.data?.embeds?.[0]) {
      console.error('Invalid result format:', result);
      return res.status(500).json({ error: 'Invalid response format' });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('NFT lookup failed:', {
      error: error.message,
      stack: error.stack,
      type: error.constructor.name
    });

    return res.status(500).json({ 
      error: 'NFT lookup failed', 
      details: error.message 
    });
  }
});

export default router; 