import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';

export default async function handler(req, res) {
  const { collection, tokenId } = req.body;
  if (!collection || !tokenId) return res.status(400).json({ error: 'Missing required parameters' });

  try {
    const result = await handleNFTLookup(`${collection}.${tokenId}`);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
} 