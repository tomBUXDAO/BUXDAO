import express from 'express';
import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

// Handle interactions
router.post('/', express.raw({ type: 'application/json' }), (req, res) => {
  // Get verification headers
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');
  const rawBody = req.body; // Express.raw provides this directly as a Buffer

  // Verify the request
  try {
    const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
      return res.status(401).end();
    }
  } catch (err) {
    return res.status(401).end();
  }

  // Parse the body
  let body;
  try {
    body = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).end();
  }

  const { type, data } = body;

  // Handle ping
  if (type === 1) {
    return res.json({ type: 1 });
  }

  // Handle commands
  if (type === 2) {
    // Immediately acknowledge
    res.json({
      type: 5,
      data: {
        content: "BUXBOT is thinking...",
        flags: 64
      }
    });

    // Process command in background
    try {
      const webhookToken = body.token;
      const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${webhookToken}`;

      // Process command
      if (data.name === 'nft') {
        const subcommand = data.options[0];
        const tokenId = subcommand.options[0].value;
        
        handleNFTLookup(`${subcommand.name}.${tokenId}`)
          .then(result => {
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result.data)
            }).catch(console.error);
          })
          .catch(error => {
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `Error: ${error.message}`,
                flags: 64
              })
            }).catch(console.error);
          });
      }
    } catch (error) {
      console.error('Command processing error:', error);
    }
    return;
  }

  // Handle unknown types
  res.json({
    type: 4,
    data: {
      content: "Unknown interaction type",
      flags: 64
    }
  });
});

export default router; 