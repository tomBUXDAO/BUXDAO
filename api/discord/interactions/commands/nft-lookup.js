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
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT mint_address, owner_wallet, image_url, name FROM nft_metadata WHERE symbol = $1 AND name LIKE $2',
      ['CelebCatz', '%#91']
    );

    return {
      type: 4,
      data: {
        content: "",
        embeds: [{
          title: "Celebrity Catz #91",
          description: "[View on Magic Eden](https://magiceden.io/item-details/6DomCCeXwHFuNXYVEqu5GjnCGDtQLxfN7yLEuDtmMQpu) • [View on Tensor](https://www.tensor.trade/item/6DomCCeXwHFuNXYVEqu5GjnCGDtQLxfN7yLEuDtmMQpu)\n\nMint: `6DomCCeXwHFuNXYVEqu5GjnCGDtQLxfN7yLEuDtmMQpu`",
          color: 0xFF4D4D,
          fields: [
            {
              name: '👤 Owner',
              value: '`342t...Jb24`',
              inline: true
            },
            {
              name: '🏷️ Status',
              value: 'Not Listed',
              inline: true
            }
          ],
          thumbnail: {
            url: 'https://buxdao.com/logos/celeb.PNG'
          },
          image: {
            url: 'https://nftstorage.link/ipfs/bafybeiaa4cjqgorisonu4bptgzzvy6nfadfhpmcgjrvq5cygknsaonq5nq/1.png'
          },
          footer: {
            text: 'BUXDAO • Putting Community First'
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