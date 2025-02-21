// Version 1.0.0 - Rank lookup command
import { pool } from '../../../config/database.js';

// Collection configurations (only collections with rarity)
export const COLLECTIONS = {
  'cat': {
    name: 'Fcked Cat',
    symbol: 'FCKEDCATZ',
    logo: '/logos/cat.PNG',
    color: 0xFFF44D // Yellow
  },
  'mm': {
    name: 'Money Monsters',
    symbol: 'MM',
    logo: '/logos/monster.PNG',
    color: 0x4DFFFF // Cyan
  },
  'mm3d': {
    name: 'Money Monsters 3D',
    symbol: 'MM3D',
    logo: '/logos/monster.PNG',
    color: 0x4DFF4D // Green
  }
};

async function getNFTByRank(collection, rank) {
  console.log('getNFTByRank called with:', { collection, rank, type: typeof rank });
  
  const collectionConfig = COLLECTIONS[collection];
  console.log('Collection config:', collectionConfig);

  if (!collectionConfig) {
    console.error('Invalid collection:', collection);
    throw new Error(`Invalid collection "${collection}". Available collections: ${Object.keys(COLLECTIONS).join(', ')}`);
  }

  if (!rank || isNaN(rank)) {
    console.error('Invalid rank:', { rank, type: typeof rank });
    throw new Error(`Invalid rank "${rank}". Please provide a valid number.`);
  }

  let client;
  try {
    console.log('Attempting database connection...');
    client = await pool.connect();
    console.log('Database connection successful');

    const query = `
      SELECT *
      FROM nft_metadata
      WHERE symbol = $1 AND rarity_rank = $2
      LIMIT 1
    `;
    const values = [collectionConfig.symbol, rank];
    
    console.log('Executing query:', { query, values });
    const result = await client.query(query, values);
    console.log('Query result:', { 
      rowCount: result?.rows?.length,
      firstRow: result?.rows?.[0] ? {
        name: result.rows[0].name,
        symbol: result.rows[0].symbol,
        rank: result.rows[0].rarity_rank
      } : null
    });

    if (!result || result.rows.length === 0) {
      console.log('NFT not found:', { collection, rank });
      throw new Error(`No NFT found with rank #${rank} in ${collectionConfig.name}`);
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

    // Always show rarity rank since these collections have it
    const rarityField = {
      name: '✨ Rarity Rank',
      value: `#${nft.rarity_rank}`,
      inline: true
    };
    console.log('Rarity field:', rarityField);
    fields.push(rarityField);

    // Format the embed response
    return {
      type: 4, // CHANNEL_MESSAGE_WITH_SOURCE
      data: {
        tts: false,
        content: "",
        embeds: [{
          title: nft.name,
          description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\n**Mint:** \`${nft.mint_address || 'Unknown'}\``,
          color: collectionConfig.color,
          fields: fields,
          thumbnail: {
            url: `https://buxdao.com${collectionConfig.logo}`
          },
          image: {
            url: nft.image_url || null
          },
          footer: {
            text: "BUXDAO • Putting Community First"
          }
        }],
        allowed_mentions: { parse: [] }
      }
    };
  } catch (error) {
    console.error('Error in getNFTByRank:', error);
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

export async function handleRankLookup(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command format. Expected string in format: collection.rank');
  }

  const [collection, rankStr] = command.split('.');

  if (!collection) {
    throw new Error('Missing collection. Available collections: ' + Object.keys(COLLECTIONS).join(', '));
  }

  if (!rankStr) {
    throw new Error('Missing rank. Format: collection.rank');
  }

  const rank = parseInt(rankStr);

  if (isNaN(rank)) {
    throw new Error(`Invalid rank "${rankStr}". Please provide a valid number.`);
  }

  // Get NFT details by rank - already formatted for Discord
  return getNFTByRank(collection, rank);
} 