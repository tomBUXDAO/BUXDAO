import express from 'express';
import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

// Raw request handler
router.post('/', async (req, res) => {
  // Get the raw request body as a buffer
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  
  try {
    await new Promise((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });
    
    const rawBody = Buffer.concat(chunks);
    
    // Get verification headers
    const signature = req.get('x-signature-ed25519');
    const timestamp = req.get('x-signature-timestamp');
    
    // Verify the request
    const isValidRequest = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
    if (!isValidRequest) {
      return res.status(401).send('Invalid request signature');
    }

    // Parse the request body
    const message = JSON.parse(rawBody);

    // Handle PING
    if (message.type === 1) {
      return res.json({ type: 1 });
    }

    // Handle commands
    if (message.type === 2) {
      // Immediately acknowledge
      res.json({
        type: 5,
        data: {
          content: "BUXBOT is thinking...",
          flags: 64
        }
      });

      // Process command in background
      if (message.data.name === 'nft') {
        const subcommand = message.data.options[0];
        const tokenId = subcommand.options[0].value;
        
        // Create webhook URL
        const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${message.token}`;
        
        try {
          const result = await handleNFTLookup(`${subcommand.name}.${tokenId}`);
          
          // Send response via webhook
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result.data)
          });
        } catch (error) {
          // Send error via webhook
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: `Error: ${error.message}`,
              flags: 64
            })
          });
        }
      }
      return;
    }

    // Handle unknown types
    return res.json({
      type: 4,
      data: {
        content: "Unknown interaction type",
        flags: 64
      }
    });
  } catch (error) {
    console.error('Interaction error:', error);
    return res.status(500).send('Internal server error');
  }
});

export default router; 