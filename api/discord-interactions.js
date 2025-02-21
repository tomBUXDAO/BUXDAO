export const config = {
  runtime: 'edge'
};

import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import { handleRankLookup } from './discord/interactions/commands/rank-lookup.js';

export default async function handler(request) {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    // Get the raw body
    const rawBody = await request.text();
    const interaction = JSON.parse(rawBody);

    // Log full interaction data
    console.log('Full Discord interaction:', JSON.stringify(interaction, null, 2));

    // Verify the request is from Discord
    const isValidRequest = verifyKey(
      Buffer.from(rawBody),
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return new Response('Invalid request signature', { status: 401 });
    }

    // Handle ping
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle application commands
    if (interaction.type === 2 && interaction.data) {
      const command = interaction.data;

      // Log command data
      console.log('Command data:', {
        name: command.name,
        options: command.options
      });

      // Handle NFT command
      if (command.name === 'nft') {
        try {
          // Get the subcommand and token ID
          const subcommand = command.options?.[0];
          if (!subcommand) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a collection and token ID',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const collection = subcommand.name;
          const tokenId = subcommand.options?.[0]?.value;

          console.log('NFT lookup request:', { collection, tokenId });

          if (!tokenId) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a token ID',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const result = await handleNFTLookup(`${collection}.${tokenId}`);
          console.log('NFT lookup result:', result);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('NFT lookup error:', error);
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: `Error: ${error.message}`,
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      // Handle rank command
      if (command.name === 'rank') {
        try {
          // Get the subcommand and rank
          const subcommand = command.options?.[0];
          if (!subcommand) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a collection and rank number',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const collection = subcommand.name;
          const rank = subcommand.options?.[0]?.value;

          console.log('Rank lookup request:', { collection, rank });

          if (!rank) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a rank number',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const result = await handleRankLookup(`${collection}.${rank}`);
          console.log('Rank lookup result:', result);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Rank lookup error:', error);
          return new Response(JSON.stringify({
            type: 4,
            data: {
              content: `Error: ${error.message}`,
              flags: 64
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }
    }

    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'Unknown command',
        flags: 64
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Critical interaction error:', error);
    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'An error occurred processing the command',
        flags: 64
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
} 