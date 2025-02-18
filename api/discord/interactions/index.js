import express from 'express';
import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

router.post('/', async (req, res) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = req.rawBody;

  if (!signature || !timestamp || !rawBody) {
    console.error('Missing headers:', { signature, timestamp, rawBody: !!rawBody });
    return res.status(401).json({ error: 'Invalid request signature' });
  }

  try {
    const isValid = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    const interaction = req.body;

    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    if (interaction.type === 2) {
      if (interaction.data.name === 'nft') {
        const subcommand = interaction.data.options[0];
        const tokenId = subcommand.options[0].value;
        
        // Immediately acknowledge
        res.json({
          type: 5,
          data: {
            content: "Processing command...",
            flags: 64
          }
        });

        try {
          const result = await handleNFTLookup(`${subcommand.name}.${tokenId}`);
          
          // Send followup message
          const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interaction.token}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.data)
          });
        } catch (error) {
          console.error('NFT lookup error:', error);
          
          // Send error message
          const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interaction.token}`;
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `Error: ${error.message}`,
              flags: 64
            })
          });
        }
        return;
      }

      return res.json({
        type: 4,
        data: {
          content: "Unknown command",
          flags: 64
        }
      });
    }

    res.status(400).json({ error: 'Unknown interaction type' });
  } catch (error) {
    console.error('Discord interaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router; 