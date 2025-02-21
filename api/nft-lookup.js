import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import { verifyKey } from 'discord-interactions';

export default async function handler(req, res) {
  const { collection, tokenId } = req.body;
  
  // Check if this is a Discord interaction
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  
  if (signature && timestamp) {
    // Handle Discord interaction
    const body = JSON.stringify(req.body);
    const isValidRequest = verifyKey(
      body,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }
  }

  // Handle the NFT lookup
  if (!collection || !tokenId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const result = await handleNFTLookup(`${collection}.${tokenId}`);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 