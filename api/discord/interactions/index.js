import express from 'express';
import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

// Middleware to verify requests are coming from Discord
function verifyDiscordRequest(clientKey) {
  return function (req, res, next) {
    console.log('Verifying Discord request...');

    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');
    const body = req.rawBody;

    if (!signature || !timestamp || !body) {
      console.error('Missing required headers or body');
      throw new Error('Invalid request signature');
    }

    try {
      const isValidRequest = verifyKey(body, signature, timestamp, clientKey);
      if (!isValidRequest) {
        console.error('Invalid request signature');
        throw new Error('Invalid request signature');
      }
      console.log('Request signature verified successfully');
      next();
    } catch (err) {
      console.error('Error verifying request:', err);
      throw new Error('Invalid request signature');
    }
  };
}

// Function to send followup message
async function sendFollowup(token, data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(
        `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${token}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error sending followup:', errorText);
        if (i === retries - 1) throw new Error(errorText);
      } else {
        return;
      }
    } catch (error) {
      console.error(`Failed to send followup (attempt ${i + 1}/${retries}):`, error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

// Verify all requests using your client's public key
router.use(verifyDiscordRequest(process.env.DISCORD_PUBLIC_KEY));

// Handle interactions
router.post('/', async (req, res) => {
  try {
    console.log('Processing interaction:', {
      type: req.body.type,
      command: req.body.data?.name,
      channel_id: req.body.channel_id
    });

    const { type, data, channel_id } = req.body;

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
        console.log('Command used in wrong channel');
        return {
          data: {
            content: `Please use this command in <#${process.env.DISCORD_COMMANDS_CHANNEL_ID}>`,
            flags: 64
          }
        };
      }

      if (name === 'nft') {
        console.log('Processing NFT lookup command');
        try {
          const subcommand = options[0];
          const tokenId = subcommand.options[0].value;
          console.log('Looking up NFT:', {
            collection: subcommand.name,
            tokenId: tokenId
          });

          // Set a timeout for the NFT lookup
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('NFT lookup timed out')), 2000);
          });

          // Process the NFT lookup with timeout
          const response = await Promise.race([
            handleNFTLookup(`${subcommand.name}.${tokenId}`),
            timeoutPromise
          ]);
          
          return response;
        } catch (error) {
          console.error('NFT lookup error:', {
            message: error.message,
            stack: error.stack
          });
          return {
            data: {
              content: error.message || 'An error occurred while looking up the NFT. Please try again.',
              flags: 64
            }
          };
        }
      }

      // Default response for unknown commands
      console.log('Unknown command:', name);
      return {
        data: {
          content: 'Unknown command',
          flags: 64
        }
      };
    }

    // For other interaction types
    console.log('Unhandled interaction type:', type);
    return {
      data: {
        content: 'Unsupported interaction type',
        flags: 64
      }
    };
  } catch (error) {
    console.error('Error processing Discord interaction:', {
      message: error.message,
      stack: error.stack,
      type: error.type
    });
    
    return {
      data: {
        content: 'An error occurred while processing your command. Please try again.',
        flags: 64
      }
    };
  }
});

export default router; 