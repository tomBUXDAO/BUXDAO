import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Get the signature and timestamp headers
  const signature = req.get('x-signature-ed25519');
  const timestamp = req.get('x-signature-timestamp');

  // Collect raw body chunks
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks);

  try {
    // Verify the request
    const isValid = verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY);
    if (!isValid) {
      return res.status(401).send('Invalid request signature');
    }

    // Parse the interaction
    const interaction = JSON.parse(rawBody);

    // Handle PING
    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    // Handle commands
    if (interaction.type === 2) {
      // Immediately acknowledge
      res.json({
        type: 5,
        data: {
          content: "Processing command...",
          flags: 64
        }
      });

      // Process command in background
      if (interaction.data.name === 'nft') {
        const subcommand = interaction.data.options[0];
        const tokenId = subcommand.options[0].value;
        
        // Create webhook URL
        const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interaction.token}`;
        
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
    console.error('Discord interaction error:', error);
    return res.status(500).send('Internal server error');
  }
} 