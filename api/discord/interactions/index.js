import express from 'express';
import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

// Middleware to verify requests are coming from Discord
function verifyDiscordRequest(clientKey) {
  return function (req, res, next) {
    console.log('Received Discord request:', {
      headers: {
        signature: req.get('X-Signature-Ed25519') ? 'present' : 'missing',
        timestamp: req.get('X-Signature-Timestamp') ? 'present' : 'missing'
      },
      hasBody: !!req.rawBody
    });

    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');
    const body = req.rawBody;

    if (!signature || !timestamp || !body) {
      console.error('Missing required headers or body:', { signature: !!signature, timestamp: !!timestamp, body: !!body });
      return res.status(401).end('Invalid request signature');
    }

    try {
      const isValidRequest = verifyKey(body, signature, timestamp, clientKey);
      if (!isValidRequest) {
        console.error('Invalid request signature');
        return res.status(401).end('Invalid request signature');
      }
      console.log('Request signature verified successfully');
      next();
    } catch (err) {
      console.error('Error verifying request:', err);
      res.status(401).end('Invalid request signature');
    }
  };
}

// Function to send followup message
async function sendFollowup(interaction_token, data) {
  try {
    console.log('Sending followup message:', {
      webhook_url: `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interaction_token}`,
      data: data
    });

    const response = await fetch(
      `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interaction_token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      }
    );

    if (!response.ok) {
      console.error('Error sending followup:', await response.text());
    } else {
      console.log('Followup message sent successfully');
    }
  } catch (error) {
    console.error('Failed to send followup:', error);
  }
}

// Verify all requests using your client's public key
router.use(verifyDiscordRequest(process.env.DISCORD_PUBLIC_KEY));

// Handle interactions
router.post('/', async (req, res) => {
  console.log('Processing interaction:', {
    type: req.body.type,
    command: req.body.data?.name,
    channel_id: req.body.channel_id
  });

  const { type, data, channel_id, token } = req.body;

  // Handle verification requests
  if (type === 1) {
    console.log('Handling PING request');
    return res.json({ type: 1 }); // Return PONG
  }

  // Handle commands
  if (type === 2) { // APPLICATION_COMMAND
    console.log('Handling command:', data.name);
    const { name, options } = data;

    // Check if command is used in the correct channel
    if (process.env.DISCORD_COMMANDS_CHANNEL_ID && 
        channel_id !== process.env.DISCORD_COMMANDS_CHANNEL_ID) {
      console.log('Command used in wrong channel:', {
        used_in: channel_id,
        should_be_in: process.env.DISCORD_COMMANDS_CHANNEL_ID
      });
      return res.json({
        type: 4,
        data: {
          content: `Please use this command in <#${process.env.DISCORD_COMMANDS_CHANNEL_ID}>`,
          flags: 64 // Ephemeral message
        }
      });
    }

    if (name === 'nft') {
      console.log('Processing NFT lookup command');
      // Acknowledge the interaction immediately
      res.json({
        type: 5, // DEFERRED_CHANNEL_MESSAGE
        data: {
          flags: 0 // Make response visible to everyone
        }
      });

      try {
        const subcommand = options[0];
        const tokenId = subcommand.options[0].value;
        console.log('Looking up NFT:', {
          collection: subcommand.name,
          tokenId: tokenId
        });
        const response = await handleNFTLookup(`${subcommand.name}.${tokenId}`);
        
        // Send the actual response as a followup
        await sendFollowup(token, response.data);
      } catch (error) {
        console.error('NFT lookup error:', error);
        await sendFollowup(token, {
          content: error.message || 'An error occurred while looking up the NFT',
          flags: 64 // Ephemeral message
        });
      }
      return;
    }

    // Default response for unknown commands
    console.log('Unknown command:', name);
    return res.json({
      type: 4,
      data: {
        content: 'Unknown command',
        flags: 64 // Ephemeral message
      }
    });
  }

  // For other interaction types
  console.log('Unhandled interaction type:', type);
  res.json({
    type: 6 // Deferred response
  });
});

export default router; 