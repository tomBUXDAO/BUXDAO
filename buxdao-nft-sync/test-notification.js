// Load environment variables first
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: `${__dirname}/.env` });

import { sendActivityNotification } from './api/integrations/discord/notifications.js';

// Test notification function
function formatDiscordMessage(data) {
  const { type, nft } = data;

  const getCollectionLogo = (symbol) => {
    const logos = {
      'FCKEDCATZ': '/logos/cat.PNG',
      'CelebCatz': '/logos/celeb.PNG',
      'MM': '/logos/monster.PNG',
      'MM3D': '/logos/monster.PNG',
      'AIBB': '/logos/bot.PNG'
    };
    return `https://buxdao.com${logos[symbol] || '/logos/default.PNG'}`;
  };

  const getDisplayName = (wallet, discordName) => {
    if (!wallet) return 'Unknown';
    return discordName || `\`${wallet.slice(0, 4)}...${wallet.slice(-4)}\``;
  };

  const getMarketplaceLinks = (mint) =>
    `[View on Magic Eden](https://magiceden.io/item-details/${mint}) • [View on Tensor](https://www.tensor.trade/item/${mint})`;

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // If it's a local PNG path (starts with /)
    if (imageUrl.startsWith('/')) {
      return `https://buxdao.com${imageUrl}`;
    }
    
    // If it's already a full URL
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a relative path without leading slash
    return `https://buxdao.com/${imageUrl}`;
  };

  const fields = [];
  let title = '';
  let description = '';
  let color = 0x000000;

  switch (type) {
    case 'listed':
      title = `📝 LISTED - ${nft.name || 'Unknown NFT'}`;
      color = 0x4CAF50;
      fields.push(
        { name: '💰 Price', value: `${Number(nft.listPrice || 0).toFixed(2)} SOL`, inline: false },
        { name: '👤 Owner', value: getDisplayName(nft.original_lister, nft.lister_discord_name), inline: false },
        { name: '🏪 Marketplace', value: nft.marketplace || 'Unknown', inline: false }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: false });
      }
      break;
    case 'sold':
      title = `💰 SOLD - ${nft.name || 'Unknown NFT'}`;
      color = 0xF44336;
      fields.push(
        { name: '💰 Price', value: `${Number(nft.salePrice || 0).toFixed(2)} SOL`, inline: false },
        { name: '👤 New Owner', value: getDisplayName(nft.owner_wallet, nft.owner_discord_id), inline: false },
        { name: '🏪 Marketplace', value: nft.marketplace || 'Unknown', inline: false }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: false });
      }
      break;
    default:
      throw new Error(`Unknown event type for embed: ${type}`);
  }

  description = getMarketplaceLinks(nft.mint_address);

  const embed = {
    title: title,
    description: description,
    color: color,
    fields: fields,
    thumbnail: {
      url: getCollectionLogo(nft.symbol)
    },
    footer: {
      text: 'BUXDAO • Putting Community First'
    },
    timestamp: new Date().toISOString()
  };

  embed.image = { url: getImageUrl(nft.image_url) };

  return { embeds: [embed] };
}

async function testNotification() {
  console.log('Testing Discord notification system...');
  console.log('Environment check:', {
    botToken: process.env.DISCORD_BOT_TOKEN ? 'Present' : 'Missing',
    channelId: process.env.DISCORD_ACTIVITY_CHANNEL_ID,
    nodeEnv: process.env.NODE_ENV
  });

  try {
    // Test a listing notification
    const listingMessage = formatDiscordMessage({
      type: 'listed',
      nft: {
        mint_address: 'TEST123456789',
        name: 'Fcked Cat #999',
        symbol: 'FCKEDCATZ',
        listPrice: 0.5,
        marketplace: 'Magic Eden',
        original_lister: 'TestWallet123456789',
        lister_discord_name: 'TestUser#1234',
        image_url: 'https://arweave.net/test-image.jpg',
        rarity_rank: 100
      }
    });

    console.log('Sending test listing notification...');
    const listingResult = await sendActivityNotification(listingMessage);
    console.log('Listing notification result:', listingResult);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test a sale notification
    const saleMessage = formatDiscordMessage({
      type: 'sold',
      nft: {
        mint_address: 'TEST123456789',
        name: 'Fcked Cat #999',
        symbol: 'FCKEDCATZ',
        salePrice: 0.75,
        marketplace: 'Magic Eden',
        owner_wallet: 'NewOwner123456789',
        owner_discord_id: 'NewUser#5678',
        image_url: 'https://arweave.net/test-image.jpg',
        rarity_rank: 100
      }
    });

    console.log('Sending test sale notification...');
    const saleResult = await sendActivityNotification(saleMessage);
    console.log('Sale notification result:', saleResult);

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing notification:', error);
  }
}

// Run the test
testNotification(); 