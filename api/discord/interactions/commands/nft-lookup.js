import { pool } from '../../../config/database.js';

// Collection configurations
export const COLLECTIONS = {
  'cat': {
    name: 'FCKed Catz',
    symbol: 'FCKEDCATZ',
    hasRarity: true
  },
  'celeb': {
    name: 'Celebrity Catz',
    symbol: 'CelebCatz',
    hasRarity: false
  },
  'mm': {
    name: 'Money Monsters',
    symbol: 'MM',
    hasRarity: true
  },
  'mm3d': {
    name: '3D Money Monsters',
    symbol: 'MM3D',
    hasRarity: true
  },
  'bot': {
    name: 'A.I. BitBots',
    symbol: 'AIBB',
    hasRarity: false
  }
};

async function getNFTDetails(collection, tokenId) {
  const collectionConfig = COLLECTIONS[collection];
  if (!collectionConfig) {
    throw new Error('Invalid collection');
  }

  const client = await pool.connect();
  try {
    // Query NFT details
    const result = await client.query(`
      SELECT *
      FROM nft_metadata
      WHERE symbol = $1 AND name LIKE $2
    `, [collectionConfig.symbol, `%#${tokenId}`]);

    if (result.rows.length === 0) {
      throw new Error('NFT not found');
    }

    const nft = result.rows[0];

    // Build fields array based on available data
    const fields = [];

    // Owner field - prefer Discord name if available
    fields.push({
      name: 'Owner',
      value: nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``,
      inline: true
    });

    // Status field - show if listed and price
    const status = nft.is_listed 
      ? `Listed for ${(Number(nft.list_price) || 0).toFixed(2)} SOL`
      : 'Not Listed';
    fields.push({
      name: 'Status',
      value: status,
      inline: true
    });

    // Last sale if available
    if (nft.last_sale_price) {
      fields.push({
        name: 'Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      });
    }

    // Rarity rank if collection supports it
    if (collectionConfig.hasRarity && nft.rarity_rank) {
      fields.push({
        name: 'Rarity Rank',
        value: `#${nft.rarity_rank}`,
        inline: true
      });
    }

    // Format the embed response
    return {
      type: 4,
      data: {
        embeds: [{
          title: nft.name,
          color: 0x9C44FB, // Purple color
          fields: fields,
          thumbnail: {
            url: nft.image_url
          },
          footer: {
            text: `${collectionConfig.name} • Mint: ${nft.mint_address}`
          }
        }]
      }
    };
  } catch (error) {
    console.error('NFT lookup error:', error);
    return {
      type: 4,
      data: {
        content: error.message,
        flags: 64 // Ephemeral message
      }
    };
  } finally {
    client.release();
  }
}

export async function handleNFTLookup(command) {
  const [collection, tokenIdStr] = command.split('.');
  const tokenId = parseInt(tokenIdStr);

  if (!collection || isNaN(tokenId)) {
    return {
      type: 4,
      data: {
        content: 'Invalid command format. Use: collection.tokenId (e.g., cat.1073)',
        flags: 64 // Ephemeral message
      }
    };
  }

  try {
    return await getNFTDetails(collection, tokenId);
  } catch (error) {
    console.error('NFT lookup error:', error);
    return {
      type: 4,
      data: {
        content: error.message,
        flags: 64 // Ephemeral message
      }
    };
  }
} 