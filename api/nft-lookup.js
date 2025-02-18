import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { collection, tokenId, webhookUrl } = req.body;

    if (!collection || !tokenId || !webhookUrl) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Process NFT lookup
    const result = await handleNFTLookup(`${collection}.${tokenId}`);

    // Send result via webhook
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data)
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('NFT lookup error:', error);

    // Try to send error via webhook if available
    if (req.body?.webhookUrl) {
      try {
        await fetch(req.body.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `Error: ${error.message}`,
            flags: 64
          })
        });
      } catch (webhookError) {
        console.error('Failed to send error via webhook:', webhookError);
      }
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
} 