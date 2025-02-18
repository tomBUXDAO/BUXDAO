import express from 'express';
import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

// Verify Discord requests
function verifyDiscordRequest(clientKey) {
  return function (req, res, next) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');
    
    try {
      const isValidRequest = verifyKey(req.rawBody, signature, timestamp, clientKey);
      if (!isValidRequest) {
        return res.status(401).end();
      }
      next();
    } catch (err) {
      return res.status(401).end();
    }
  };
}

// Handle interactions
router.post('/', verifyDiscordRequest(process.env.DISCORD_PUBLIC_KEY), (req, res) => {
  const { type, data } = req.body;

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
      const webhookToken = req.body.token;
      const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${webhookToken}`;

      // Send followup immediately
      fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: "Processing your request...",
          flags: 64
        })
      }).catch(console.error);

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