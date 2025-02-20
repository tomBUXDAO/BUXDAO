import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';

export default async function handler(req, res) {
  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody = req.body;

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

    const interaction = JSON.parse(rawBody);

    // Handle ping
    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    // Handle application commands
    if (interaction.type === 2 && interaction.data) {
      const command = interaction.data;

      // Handle NFT command
      if (command.name === 'nft') {
        try {
          // Get the subcommand and token ID
          const subcommand = command.options[0];
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
          const tokenId = subcommand.options[0]?.value;

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