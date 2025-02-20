// Version 1.0.4 - Updated command handling
import { pool } from '../../../config/database.js';

// Collection configurations
export const COLLECTIONS = {
  'cat': {
    name: 'Fcked Cat',
    symbol: 'FCKEDCATZ',
    hasRarity: true,
    logo: '/logos/cat.PNG',
    color: 0xFFF44D // Yellow
  },
  'celeb': {
    name: 'Celebrity Catz',
    symbol: 'CelebCatz',
    hasRarity: false,
    logo: '/logos/celeb.PNG',
    color: 0xFF4D4D // Red
  },
  'mm': {
    name: 'Money Monsters',
    symbol: 'MM',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFFFF // Cyan
  },
  'mm3d': {
    name: 'Money Monsters 3D',
    symbol: 'MM3D',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFF4D // Green
  },
  'bot': {
    name: 'A.I. BitBots',
    symbol: 'AIBB',
    hasRarity: false,
    logo: '/logos/bot.PNG',
    color: 0xFF4DFF // Pink
  }
};

async function getNFTDetails(collection, tokenId) {
  console.log('getNFTDetails called with:', { collection, tokenId, type: typeof tokenId });
  
  const collectionConfig = COLLECTIONS[collection];
  console.log('Collection config:', collectionConfig);

  if (!collectionConfig) {
    console.error('Invalid collection:', collection);
    throw new Error(`Invalid collection "${collection}". Available collections: ${Object.keys(COLLECTIONS).join(', ')}`);
  }

  if (!tokenId || isNaN(tokenId)) {
    console.error('Invalid token ID:', { tokenId, type: typeof tokenId });
    throw new Error(`Invalid token ID "${tokenId}". Please provide a valid number.`);
  }

  let client;
  try {
    console.log('Attempting database connection...');
    client = await pool.connect();
    console.log('Database connection successful');

    const query = `
      SELECT *
      FROM nft_metadata
      WHERE symbol = $1 AND name = $2
      LIMIT 1
    `;
    const values = [collectionConfig.symbol, `${collectionConfig.name} #${tokenId}`];
    
    console.log('Executing query:', { query, values });
    const result = await client.query(query, values);
    console.log('Query result:', { 
      rowCount: result?.rows?.length,
      firstRow: result?.rows?.[0] ? {
        name: result.rows[0].name,
        symbol: result.rows[0].symbol
      } : null
    });

    if (!result || result.rows.length === 0) {
      console.log('NFT not found:', { collection, tokenId });
      throw new Error(`NFT not found: ${collectionConfig.name} #${tokenId}`);
    }

    const nft = result.rows[0];
    console.log('Found NFT data:', {
      name: nft.name,
      owner: nft.owner_discord_id || nft.owner_wallet,
      listed: nft.is_listed,
      price: nft.list_price
    });

    // Build fields array based on available data
    const fields = [];

    // Owner field - prefer Discord name if available
    const ownerField = {
      name: '👤 Owner',
      value: nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : nft.owner_wallet
          ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
          : 'Unknown',
      inline: true
    };
    console.log('Owner field:', ownerField);
    fields.push(ownerField);

    // Status field - show if listed and price
    const status = nft.is_listed 
      ? `Listed for ${(Number(nft.list_price) || 0).toFixed(2)} SOL`
      : 'Not Listed';
    const statusField = {
      name: '🏷️ Status',
      value: status,
      inline: true
    };
    console.log('Status field:', statusField);
    fields.push(statusField);

    // Last sale if available
    if (nft.last_sale_price) {
      const saleField = {
        name: '💰 Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      };
      console.log('Sale field:', saleField);
      fields.push(saleField);
    }

    // Rarity rank if collection supports it
    if (collectionConfig.hasRarity && nft.rarity_rank) {
      const rarityField = {
        name: '✨ Rarity Rank',
        value: `#${nft.rarity_rank}`,
        inline: true
      };
      console.log('Rarity field:', rarityField);
      fields.push(rarityField);
    }

    // Format the embed response
    const title = `${collectionConfig.name} #${tokenId}`.split('').join('\u200B');  // Add zero-width space between each character

    return {
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        tts: false,
        content: "",
        embeds: [{
          title: title,
          description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})`,
          color: collectionConfig.color,
          fields: fields,
          image: {
            url: nft.image_url || null
          },
          thumbnail: {
            url: `${process.env.NODE_ENV === 'production' ? 'https://buxdao.com' : 'http://localhost:3001'}${collectionConfig.logo}`
          },
          footer: {
            text: `Mint: ${nft.mint_address || 'Unknown'}`
          }
        }],
        allowed_mentions: { parse: [] }
      }
    };
  } catch (error) {
    console.error('Error in getNFTDetails:', error);
    if (error.code === '57014') {
      throw new Error('The request took too long to process. Please try again.');
    }
    throw error;
  } finally {
    if (client) {
      try {
        await client.release();
        console.log('Database client released');
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

export async function handleNFTLookup(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command format. Expected string in format: collection.tokenId');
  }

  const [collection, tokenIdStr] = command.split('.');

  if (!collection) {
    throw new Error('Missing collection. Available collections: ' + Object.keys(COLLECTIONS).join(', '));
  }

  if (!tokenIdStr) {
    throw new Error('Missing token ID. Format: collection.tokenId');
  }

  const tokenId = parseInt(tokenIdStr);

  if (isNaN(tokenId)) {
    throw new Error(`Invalid token ID "${tokenIdStr}". Please provide a valid number.`);
  }

  // Get NFT details - already formatted for Discord
  return getNFTDetails(collection, tokenId);
} 