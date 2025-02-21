import 'dotenv/config';
import { COLLECTIONS } from './interactions/commands/nft-lookup.js';
import { COLLECTIONS as RANK_COLLECTIONS } from './interactions/commands/rank-lookup.js';
import fetch from 'node-fetch';

const DISCORD_API = 'https://discord.com/api/v10';

// Create commands array with both NFT and rank commands
const commands = [
  {
    name: 'nft',
    description: 'Look up NFT details',
    type: 1, // CHAT_INPUT
    options: Object.entries(COLLECTIONS).map(([prefix, config]) => ({
      type: 1, // Subcommand
      name: prefix,
      description: `Look up ${config.name} NFT details`,
      options: [{
        type: 4, // INTEGER
        name: 'id',
        description: 'Token ID number',
        required: true
      }]
    }))
  },
  {
    name: 'rank',
    description: 'Look up NFT by rarity rank',
    type: 1, // CHAT_INPUT
    options: Object.entries(RANK_COLLECTIONS).map(([prefix, config]) => ({
      type: 1, // Subcommand
      name: prefix,
      description: `Look up ${config.name} by rarity rank`,
      options: [{
        type: 4, // INTEGER
        name: 'rank',
        description: 'Rarity rank number',
        required: true
      }]
    }))
  }
];

async function registerCommands() {
  try {
    // First delete all existing commands
    const deleteResponse = await fetch(
      `${DISCORD_API}/applications/${process.env.DISCORD_CLIENT_ID}/commands`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([]) // Empty array to delete all commands
      }
    );

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete commands: ${deleteResponse.statusText}`);
    }

    // Then register new commands
    const response = await fetch(
      `${DISCORD_API}/applications/${process.env.DISCORD_CLIENT_ID}/commands`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commands)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to register commands: ${JSON.stringify(error, null, 2)}`);
    }

    const data = await response.json();
    console.log('Successfully registered commands:', data);
  } catch (error) {
    console.error('Error registering commands:', error);
    process.exit(1);
  }
}

registerCommands(); 