import { handleMyBux } from './api/discord/interactions/commands/mybux.js';
import { handleMyNFTs } from './api/discord/interactions/commands/mynfts.js';
import { handleCollections } from './api/discord/interactions/commands/collections.js';

const discordId = '931160720261939230';
const username = 'TestUser';
const issuerId = discordId; // Simulate user checking their own info
const adminIds = ['931160720261939230']; // Simulate as admin for full access

async function testMyBux() {
  const result = await handleMyBux({
    targetDiscordId: discordId,
    targetUsername: username,
    issuerId,
    adminIds
  });
  console.log('\n/mybux result:', JSON.stringify(result, null, 2));
}

async function testMyNFTs() {
  const result = await handleMyNFTs({
    targetDiscordId: discordId,
    targetUsername: username,
    issuerId,
    adminIds
  });
  console.log('\n/mynfts result:', JSON.stringify(result, null, 2));
}

async function testCollections() {
  // Use a sample collection symbol, e.g. 'FCKEDCATZ'
  const result = await handleCollections({
    collectionSymbol: 'FCKEDCATZ'
  });
  console.log('\n/collections result:', JSON.stringify(result, null, 2));
}

(async () => {
  await testMyBux();
  await testMyNFTs();
  await testCollections();
  process.exit(0);
})(); 