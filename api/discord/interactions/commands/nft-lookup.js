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
    name: 'AI Bitbot',
    symbol: 'AIBB',
    hasRarity: false,
    logo: '/logos/bot.PNG',
    color: 0xFF4DFF // Pink
  }
};

async function getNFTDetails(collection, tokenId) {
  const collectionConfig = COLLECTIONS[collection];
  if (!collectionConfig) {
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

  let client;
  try {
    client = await pool.connect();
    console.log('Looking up NFT:', { collection, tokenId });

    const result = await client.query(
      `SELECT n.*, 
              ur.discord_id as lister_discord_id,
              ur.discord_name as lister_discord_name
       FROM nft_metadata n
       LEFT JOIN user_roles ur ON ur.wallet_address = n.original_lister
       WHERE n.symbol = $1 AND n.name LIKE $2`,
      [collectionConfig.symbol, `%#${tokenId}`]
    );

    console.log('Query result:', {
      found: result.rows.length > 0,
      firstRow: result.rows[0] ? {
        name: result.rows[0].name,
        owner: result.rows[0].owner_wallet,
        mint: result.rows[0].mint_address
      } : null
    });

    if (!result.rows.length) {
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'Error',
            description: `${collectionConfig.name} #${tokenId} not found in database`,
            color: 0xFF0000
          }]
        }
      };
    }

    const nft = result.rows[0];

    // Build fields array based on available data
    const fields = [];

    // Owner field - show original_lister (with Discord if available) if listed, otherwise show owner
    const ownerValue = nft.is_listed 
      ? nft.lister_discord_id
        ? `<@${nft.lister_discord_id}>`
        : `\`${nft.original_lister.slice(0, 4)}...${nft.original_lister.slice(-4)}\``
      : nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : nft.owner_wallet
          ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
          : 'Unknown';

    fields.push({
      name: '👤 Owner',
      value: ownerValue,
      inline: true
    });

    // Status field - show if listed and price
    fields.push({
      name: '🏷️ Status',
      value: nft.is_listed 
        ? `Listed for ${(Number(nft.list_price) || 0).toFixed(2)} SOL`
        : 'Not Listed',
      inline: true
    });

    // Last sale if available
    if (nft.last_sale_price) {
      fields.push({
        name: '💰 Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      });
    }

    // Rarity rank if collection supports it
    if (collectionConfig.hasRarity && nft.rarity_rank) {
      fields.push({
        name: '✨ Rarity Rank',
        value: `#${nft.rarity_rank}`,
        inline: true
      });
    }

    return {
      type: 4,
      data: {
        content: "",
        embeds: [{
          title: nft.name,
          description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\nMint: \`${nft.mint_address || 'Unknown'}\``,
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
        }]
      }
    };
  } catch (error) {
    console.error('Error in getNFTDetails:', error);
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Database Error',
          description: error.message,
          color: 0xFF0000
        }]
      }
    };
  } finally {
    if (client) {
      await client.release();
    }
  }
}

export async function handleNFTLookup(command) {
  if (!command || typeof command !== 'string') {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Invalid command format. Expected string in format: collection.tokenId',
          color: 0xFF0000
        }]
      }
    };
  }

  const [collection, tokenIdStr] = command.split('.');

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

  if (!tokenIdStr) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Missing token ID. Format: collection.tokenId',
          color: 0xFF0000
        }]
      }
    };
  }

  const tokenId = parseInt(tokenIdStr);

  if (isNaN(tokenId)) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: `Invalid token ID "${tokenIdStr}". Please provide a valid number.`,
          color: 0xFF0000
        }]
      }
    };
  }

  try {
    return await getNFTDetails(collection, tokenId);
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