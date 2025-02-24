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
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: `Invalid collection "${collection}". Available collections: ${Object.keys(COLLECTIONS).join(', ')}`,
          color: 0xFF0000
        }]
      }
    };
  }

  if (!rank || isNaN(rank)) {
    console.error('Invalid rank:', { rank, type: typeof rank });
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: `Invalid rank "${rank}". Please provide a valid number.`,
          color: 0xFF0000
        }]
      }
    };
  }

  let client;
  try {
    console.log('Attempting database connection...');
    client = await pool.connect();
    console.log('Database connection successful');

    const query = `
      SELECT n.*,
             ur.discord_id as lister_discord_id,
             ur.discord_name as lister_discord_name,
             ur2.discord_id as owner_discord_id,
             ur2.discord_name as owner_name
      FROM nft_metadata n
      LEFT JOIN user_roles ur ON ur.wallet_address = n.original_lister
      LEFT JOIN user_roles ur2 ON ur2.wallet_address = n.owner_wallet
      WHERE n.symbol = $1 AND n.rarity_rank = $2
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
        rank: result.rows[0].rarity_rank,
        is_listed: result.rows[0].is_listed,
        original_lister: result.rows[0].original_lister
      } : null
    });

    if (!result || result.rows.length === 0) {
      console.log('NFT not found:', { collection, rank });
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'Error',
            description: `No NFT found with rank #${rank} in ${collectionConfig.name}`,
            color: 0xFF0000
          }]
        }
      };
    }

    const nft = result.rows[0];
    console.log('Processing NFT:', {
      name: nft.name,
      is_listed: nft.is_listed,
      original_lister: nft.original_lister,
      lister_discord_id: nft.lister_discord_id,
      owner_wallet: nft.owner_wallet,
      owner_discord_id: nft.owner_discord_id
    });

    // Build fields array based on available data
    const fields = [];

    // Owner field - use original_lister if it exists, otherwise owner_wallet
    const displayWallet = nft.original_lister || nft.owner_wallet;
    const displayDiscordId = nft.original_lister ? nft.lister_discord_id : nft.owner_discord_id;

    const ownerField = {
      name: '👤 Owner',
      value: displayDiscordId
        ? `<@${displayDiscordId}>`
        : `\`${displayWallet.slice(0, 4)}...${displayWallet.slice(-4)}\``,
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
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Database Error',
          description: error.code === '57014' 
            ? 'The request took too long to process. Please try again.'
            : error.message,
          color: 0xFF0000
        }]
      }
    };
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
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Invalid command format. Expected string in format: collection.rank',
          color: 0xFF0000
        }]
      }
    };
  }

  const [collection, rankStr] = command.split('.');

  if (!collection) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Missing collection. Available collections: ' + Object.keys(COLLECTIONS).join(', '),
          color: 0xFF0000
        }]
      }
    };
  }

  if (!rankStr) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Missing rank. Format: collection.rank',
          color: 0xFF0000
        }]
      }
    };
  }

  const rank = parseInt(rankStr);

  if (isNaN(rank)) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: `Invalid rank "${rankStr}". Please provide a valid number.`,
          color: 0xFF0000
        }]
      }
    };
  }

  try {
    return await getNFTByRank(collection, rank);
  } catch (error) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: error.message,
          color: 0xFF0000
        }]
      }
    };
  }
} 