import express from 'express';
import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

const router = express.Router();

// Middleware to verify requests are coming from Discord
function verifyDiscordRequest(clientKey) {
  return function (req, res, next) {
    console.log('Discord request received:', {
      method: req.method,
      path: req.path,
      headers: Object.keys(req.headers),
      hasBody: !!req.body,
      hasRawBody: !!req.rawBody
    });

    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');
    const body = req.rawBody;

    if (!signature || !timestamp || !body) {
      console.error('Missing required headers or body:', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        hasBody: !!body
      });
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    try {
      const isValidRequest = verifyKey(body, signature, timestamp, clientKey);
      if (!isValidRequest) {
        console.error('Invalid request signature');
        return res.status(401).json({ error: 'Invalid request signature' });
      }
      console.log('Request signature verified successfully');
      next();
    } catch (err) {
      console.error('Error verifying request:', err);
      return res.status(401).json({ error: 'Invalid request signature' });
    }
  };
}

// Function to send followup message with improved error handling
async function sendFollowup(token, data, retries = 3) {
  console.log('Starting followup message:', { 
    token: token?.slice(0, 8), 
    type: data?.type,
    content: data?.content?.slice(0, 50),
    hasEmbed: !!data?.embeds
  });
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Followup attempt ${i + 1}/${retries}`);
      
      const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${token}`;
      console.log('Using webhook URL:', webhookUrl.replace(token, '[REDACTED]'));
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      const responseText = await response.text();
      console.log('Followup response:', { 
        status: response.status,
        headers: Object.fromEntries(response.headers),
        text: responseText.slice(0, 100)
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('retry-after');
          console.log('Rate limited, waiting:', retryAfter);
          await new Promise(resolve => setTimeout(resolve, (parseInt(retryAfter) || 5) * 1000));
          continue;
        }
        
        if (i === retries - 1) {
          throw new Error(`Failed to send followup: ${responseText}`);
        }
        
        const backoff = Math.pow(2, i) * 1000;
        console.log(`Backing off for ${backoff}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      console.log('Followup sent successfully');
      return;
    } catch (error) {
      console.error(`Followup attempt ${i + 1}/${retries} failed:`, error);
      if (i === retries - 1) throw error;
    }
  }
}

// Verify all requests using your client's public key
router.use(verifyDiscordRequest(process.env.DISCORD_PUBLIC_KEY));

// Handle interactions
router.post('/', async (req, res) => {
  console.log('Raw request body:', req.rawBody?.toString());
  console.log('Parsed request body:', req.body);
  
  const { type, data, token } = req.body;
  console.log('Received interaction:', { 
    type,
    command: data?.name,
    options: data?.options,
    hasToken: !!token
  });

  try {
    // Handle verification requests immediately
    if (type === 1) {
      console.log('Handling PING request');
      return res.json({ type: 1 });
    }

    // For all other requests, acknowledge immediately
    console.log('Sending initial acknowledgment');
    res.json({
      type: 5,
      data: {
        content: "Processing your request...",
        flags: 64
      }
    });

    // Process the command in the background
    if (type === 2) {
      const { name, options } = data;
      console.log('Processing command:', { name, options });

      try {
        if (name === 'nft') {
          const subcommand = options[0];
          const tokenId = subcommand.options[0].value;
          console.log('NFT lookup:', { collection: subcommand.name, tokenId });

          console.log('Calling handleNFTLookup');
          const result = await handleNFTLookup(`${subcommand.name}.${tokenId}`);
          console.log('NFT lookup result:', result);

          console.log('Sending NFT lookup response');
          await sendFollowup(token, result.data);
        } else {
          console.log('Unknown command:', name);
          await sendFollowup(token, {
            content: 'Unknown command',
            flags: 64
          });
        }
      } catch (cmdError) {
        console.error('Command processing error:', {
          message: cmdError.message,
          stack: cmdError.stack
        });
        await sendFollowup(token, {
          content: cmdError.message || 'An error occurred while processing your command',
          flags: 64
        });
      }
    }
  } catch (error) {
    console.error('Interaction error:', {
      message: error.message,
      stack: error.stack
    });
    try {
      if (token) {
        await sendFollowup(token, {
          content: 'An error occurred while processing your request',
          flags: 64
        });
      }
    } catch (followupError) {
      console.error('Failed to send error followup:', followupError);
    }
  }
});

export default router; 