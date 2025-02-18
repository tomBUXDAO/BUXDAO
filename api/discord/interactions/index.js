import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './commands/nft-lookup.js';
import fetch from 'node-fetch';

// Export config for Edge Function
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East (N. Virginia)
};

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { 'Content-Type': 'application/json' }}
    );
  }

  try {
    // Get Discord headers
    const signature = req.headers.get('x-signature-ed25519');
    const timestamp = req.headers.get('x-signature-timestamp');
    
    // Get raw body
    const rawBody = await req.text();

    // Verify the signature
    const isValid = verifyKey(
      Buffer.from(rawBody),
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Parse the interaction
    const interaction = JSON.parse(rawBody);

    // Handle PING
    if (interaction.type === 1) {
      return new Response(
        JSON.stringify({ type: 1 }), 
        { status: 200, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Handle commands
    if (interaction.type === 2) {
      // Immediately acknowledge
      const response = new Response(
        JSON.stringify({
          type: 5,
          data: {
            content: "Processing command...",
            flags: 64
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' }}
      );

      // Process command in background
      if (interaction.data.name === 'nft') {
        const subcommand = interaction.data.options[0];
        const tokenId = subcommand.options[0].value;
        
        // Create webhook URL
        const webhookUrl = `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interaction.token}`;
        
        // Process in background
        handleNFTLookup(`${subcommand.name}.${tokenId}`)
          .then(result => {
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(result.data)
            });
          })
          .catch(error => {
            fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: `Error: ${error.message}`,
                flags: 64
              })
            });
          });
      }

      return response;
    }

    // Handle unknown types
    return new Response(
      JSON.stringify({ error: 'Unknown interaction type' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error('Discord interaction error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
} 