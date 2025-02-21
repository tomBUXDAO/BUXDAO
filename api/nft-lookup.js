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
    console.log('NFT lookup result:', {
      type: result?.type,
      hasData: !!result?.data,
      hasEmbeds: !!result?.data?.embeds,
      firstEmbed: result?.data?.embeds?.[0] ? {
        title: result.data.embeds[0].title,
        hasImage: !!result.data.embeds[0].image,
        imageUrl: result.data.embeds[0].image?.url,
        fields: result.data.embeds[0].fields?.length
      } : null
    });

    if (!result?.data?.embeds?.[0]) {
      console.error('Invalid result format:', {
        result,
        type: typeof result,
        hasData: !!result?.data,
        hasEmbeds: !!result?.data?.embeds
      });
      return res.status(500).json({ 
        error: 'Invalid response format',
        details: 'Response is missing required embed data'
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error('NFT lookup failed:', {
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack?.split('\n'),
      type: error.constructor.name
    });

    return res.status(500).json({ 
      error: 'NFT lookup failed', 
      details: error.message,
      code: error.code
    });
  }
});

export default router; 