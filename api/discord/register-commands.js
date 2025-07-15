import 'dotenv/config';
import { COLLECTIONS } from './interactions/commands/nft-lookup.js';
import { COLLECTIONS as RANK_COLLECTIONS } from './interactions/commands/rank-lookup.js';
import fetch from 'node-fetch';

const DISCORD_API = 'https://discord.com/api/v10';

const collectionsConfig = [
  { name: 'FCKEDCATZ', address: 'EPeeeDr21EPJ4GJgjuRJ8SHD4A2d59erMaTtWaTT2hqm' },
  { name: 'MM', address: '3EyhWtevHSkXg4cGsCurLLJ1NEc3rR3fWrYBx5CVLn7R' },
  { name: 'AIBB', address: '41swUeWc8Hm87T7ahtndUWfDTLRWndWYFpuE4UKp79Vq' },
  { name: 'MM3D', address: 'HLD74kSbBLf4aYnGkZ4dYSoh9cZvS4exAB9t7pPDDPvE' },
  { name: 'CelebCatz', address: 'H6c8gJqMk2ktfKriGGLB14RKPAz2otz1iPv2AAegetXD' },
  { name: 'AELxAIBB', address: 'EiWQMsSysgAKofe8EVtVSjeCxv1DXJJ4BCiH3gbYF4K7' },
  { name: 'AIRB', address: '4obz5pRAjZyV2zE4dbpSfhtagQcWt6W3UdJ6FqsCGnLE' },
  { name: 'AUSQRL', address: 'GLN64oj3rQq4qy93P9YV5xF8U2veiFcGbGaTTZQhPoj5' },
  { name: 'DDBOT', address: 'A5FjnNDwXprq7rRmoHn7fhimcDsmMdn579WX9MqBem9Y' },
  { name: 'CLB', address: 'CLPKnYaB5JdCBMBJJ32W1qXoYC3kShxT3sxPLuVVFgD7' }
];

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
  },
  {
    name: 'addclaim',
    description: "Admin: Award BUX tokens to a user's claim account",
    type: 1, // CHAT_INPUT
    options: [
      {
        type: 6, // USER
        name: 'user',
        description: 'User to award BUX to',
        required: true
      },
      {
        type: 4, // INTEGER
        name: 'amount',
        description: 'Amount of BUX to award',
        required: true
      }
    ]
  },
  {
    name: 'profile',
    description: 'View your BUXDAO profile information',
    type: 1, // CHAT_INPUT
    options: [
      {
        type: 6, // USER
        name: 'user',
        description: 'User to view profile for (admin only)',
        required: false
      }
    ]
  },
  {
    name: 'mybux',
    description: 'View your BUX token balance and cashout value',
    type: 1, // CHAT_INPUT
    options: [
      {
        type: 6, // USER
        name: 'user',
        description: 'User to view BUX for (admin only)',
        required: false
      }
    ]
  },
  {
    name: 'mynfts',
    description: 'View your NFT collection counts',
    type: 1, // CHAT_INPUT
    options: [
      {
        type: 6, // USER
        name: 'user',
        description: 'User to view NFT holdings for (admin only)',
        required: false
      }
    ]
  },
  {
    name: 'collections',
    description: 'View stats for a BUXDAO collection',
    type: 1, // CHAT_INPUT
    options: [
      {
        type: 3, // STRING (dropdown)
        name: 'collection',
        description: 'Select a collection',
        required: true,
        choices: collectionsConfig.map(c => ({ name: c.name, value: c.name }))
      }
    ]
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