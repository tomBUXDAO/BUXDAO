// Version 1.0.3 - Added detailed logging
import { pool } from '../../../config/database.js';

// Collection configurations
export const COLLECTIONS = {
  'cat': {
    name: 'Fcked Catz',
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
  console.log('getNFTDetails called with:', { collection, tokenId });
  
  const collectionConfig = COLLECTIONS[collection];
  console.log('Collection config:', collectionConfig);

  if (!collectionConfig) {
    console.error('Invalid collection:', collection);
    throw new Error(`Invalid collection "${collection}"`);
  }

  if (!tokenId || isNaN(tokenId)) {
    console.error('Invalid token ID:', tokenId);
    throw new Error(`Invalid token ID "${tokenId}"`);
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
    console.log('Query result rows:', result?.rows?.length);

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
      name: 'Owner',
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
      name: 'Status',
      value: status,
      inline: true
    };
    console.log('Status field:', statusField);
    fields.push(statusField);

    // Last sale if available
    if (nft.last_sale_price) {
      const saleField = {
        name: 'Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      };
      console.log('Sale field:', saleField);
      fields.push(saleField);
    }

    // Rarity rank if collection supports it
    if (collectionConfig.hasRarity && nft.rarity_rank) {
      const rarityField = {
        name: 'Rarity Rank',
        value: `#${nft.rarity_rank}`,
        inline: true
      };
      console.log('Rarity field:', rarityField);
      fields.push(rarityField);
    }

    // Format the embed response
    const response = {
      type: 4,
      data: {
        embeds: [{
          title: nft.name,
          color: 0x9C44FB, // Purple color
          fields: fields,
          thumbnail: {
            url: nft.image_url || null
          },
          footer: {
            text: `${collectionConfig.name} • Mint: ${nft.mint_address || 'Unknown'}`
          }
        }]
      }
    };

    console.log('Generated response:', JSON.stringify(response, null, 2));
    return response;
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
  console.log('handleNFTLookup called with:', command);

  if (!command || typeof command !== 'string') {
    console.error('Invalid command format:', command);
    throw new Error('Invalid command format');
  }

  const [collection, tokenIdStr] = command.split('.');
  console.log('Parsed command:', { collection, tokenIdStr });

  const tokenId = parseInt(tokenIdStr);
  console.log('Parsed token ID:', tokenId);

  if (!collection || isNaN(tokenId)) {
    console.error('Invalid command format:', { collection, tokenIdStr });
    throw new Error('Invalid command format. Use: collection.tokenId (e.g., cat.1073)');
  }

  return getNFTDetails(collection, tokenId);
} 