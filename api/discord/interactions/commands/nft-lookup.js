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
    throw new Error(`Invalid collection "${collection}"`);
  }

  if (!tokenId || isNaN(tokenId)) {
    throw new Error(`Invalid token ID "${tokenId}"`);
  }

  const client = await pool.connect();
  try {
    const query = `
      SELECT *
      FROM nft_metadata
      WHERE symbol = $1 
      AND name = $2
    `;
    const values = [collectionConfig.symbol, `${collectionConfig.name} #${tokenId}`];
    const result = await client.query(query, values);

    if (!result || result.rows.length === 0) {
      throw new Error(`NFT not found: ${collectionConfig.name} #${tokenId}`);
    }

    const nft = result.rows[0];
    const fields = [];

    fields.push({
      name: '👤 Owner',
      value: nft.owner_wallet ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\`` : 'Unknown',
      inline: true
    });

    fields.push({
      name: '🏷️ Status',
      value: nft.is_listed === true ? `Listed for ${(Number(nft.list_price) || 0).toFixed(2)} SOL` : 'Not Listed',
      inline: true
    });

    if (nft.last_sale_price && !isNaN(nft.last_sale_price)) {
      fields.push({
        name: '💰 Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      });
    }

    if (collectionConfig.hasRarity && nft.rarity_rank && !isNaN(nft.rarity_rank)) {
      fields.push({
        name: '✨ Rarity Rank',
        value: `#${nft.rarity_rank}`,
        inline: true
      });
    }

    return {
      type: 4,
      data: {
        embeds: [{
          title: nft.name,
          description: nft.mint_address 
            ? `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\nMint: \`${nft.mint_address}\``
            : 'Mint address not available',
          color: collectionConfig.color,
          fields: fields,
          thumbnail: {
            url: `https://buxdao.com${collectionConfig.logo}`
          },
          image: {
            url: nft.image_url
          },
          footer: {
            text: "BUXDAO • Putting Community First"
          }
        }]
      }
    };
  } finally {
    client.release();
  }
}

export async function handleNFTLookup(command) {
  const [collection, tokenIdStr] = command.split('.');
  const tokenId = parseInt(tokenIdStr);
  return getNFTDetails(collection, tokenId);
} 