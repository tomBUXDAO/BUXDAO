import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import { handleRankLookup } from './discord/interactions/commands/rank-lookup.js';

export default async function handler(req, res) {
  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    
    // Handle raw body properly
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    const strBody = rawBody.toString('utf8');
    const interaction = JSON.parse(strBody);

    // Log full interaction data
    console.log('Full Discord interaction:', JSON.stringify(interaction, null, 2));

    // Verify the request is from Discord
    const isValidRequest = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return res.status(401).send('Invalid request signature');
    }

    // Handle ping
    if (interaction.type === 1) {
      return res.json({ type: 1 });
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
            return res.json({
              type: 4,
              data: {
                content: 'Please provide a collection and token ID',
                flags: 64
              }
            });
          }

          const collection = subcommand.name;
          const tokenId = subcommand.options?.[0]?.value;

          console.log('NFT lookup request:', { collection, tokenId });

          if (!tokenId) {
            return res.json({
              type: 4,
              data: {
                content: 'Please provide a token ID',
                flags: 64
              }
            });
          }

          const result = await handleNFTLookup(`${collection}.${tokenId}`);
          console.log('NFT lookup result:', result);
          return res.json(result);
        } catch (error) {
          console.error('NFT lookup error:', error);
          return res.json({
            type: 4,
            data: {
              content: `Error: ${error.message}`,
              flags: 64
            }
          });
        }
      }

      // Handle rank command
      if (command.name === 'rank') {
        try {
          // Get the subcommand and rank
          const subcommand = command.options?.[0];
          if (!subcommand) {
            return res.json({
              type: 4,
              data: {
                content: 'Please provide a collection and rank number',
                flags: 64
              }
            });
          }

          const collection = subcommand.name;
          const rank = subcommand.options?.[0]?.value;

          console.log('Rank lookup request:', { collection, rank });

          if (!rank) {
            return res.json({
              type: 4,
              data: {
                content: 'Please provide a rank number',
                flags: 64
              }
            });
          }

          const result = await handleRankLookup(`${collection}.${rank}`);
          console.log('Rank lookup result:', result);
          return res.json(result);
        } catch (error) {
          console.error('Rank lookup error:', error);
          return res.json({
            type: 4,
            data: {
              content: `Error: ${error.message}`,
              flags: 64
            }
          });
        }
      }
    }

    return res.json({
      type: 4,
      data: {
        content: 'Unknown command',
        flags: 64
      }
    });
  } catch (error) {
    console.error('Critical interaction error:', error);
    return res.json({
      type: 4,
      data: {
        content: 'An error occurred processing the command',
        flags: 64
      }
    });
  }
} 