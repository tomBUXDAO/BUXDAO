import express from 'express';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('NFT lookup request received:', {
    body: req.body,
    headers: req.headers,
    url: req.url,
    method: req.method
  });

  try {
    const { collection, tokenId, webhookUrl } = req.body;

    if (!collection || !tokenId) {
      console.error('Missing parameters:', { collection, tokenId });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Process NFT lookup
    console.log('Starting NFT lookup process:', { collection, tokenId });
    
    try {
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

      // If webhookUrl is provided, send result via webhook
      if (webhookUrl) {
        console.log('Sending webhook response:', {
          webhookUrl: webhookUrl.replace(/\d{10,}/g, '***'),
          resultType: result.type,
          hasEmbed: !!result.data?.embeds
        });

        const webhookResponse = await fetch(webhookUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result.data)
        });

        if (!webhookResponse.ok) {
          console.error('Webhook request failed:', {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText
          });
          throw new Error(`Webhook failed with status ${webhookResponse.status}`);
        }

        return res.status(200).json({ success: true });
      }

      // If no webhookUrl, return the result directly
      return res.status(200).json(result);
    } catch (lookupError) {
      console.error('NFT lookup process failed:', {
        error: lookupError.message,
        stack: lookupError.stack
      });
      throw lookupError;
    }
  } catch (error) {
    console.error('NFT lookup error:', {
      message: error.message,
      stack: error.stack
    });

    // Try to send error via webhook if available
    if (req.body?.webhookUrl) {
      try {
        await fetch(req.body.webhookUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Error looking up NFT: ${error.message}`,
            flags: 64
          })
        });
      } catch (webhookError) {
        console.error('Failed to send error via webhook:', {
          message: webhookError.message,
          originalError: error.message
        });
      }
    }

    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router; 