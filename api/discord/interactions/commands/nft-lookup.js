import { getClient } from '../../../config/database.js';

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
  console.log('Looking up NFT:', { collection, tokenId });
  
  const collectionConfig = COLLECTIONS[collection];
  if (!collectionConfig) {
    throw new Error(`Invalid collection "${collection}"`);
  }

  if (!tokenId || isNaN(tokenId)) {
    throw new Error(`Invalid token ID "${tokenId}"`);
  }

  let client;
  try {
    // Get a client with timeout
    client = await Promise.race([
      getClient(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 8000)
      )
    ]);
    
    console.log('Database connection acquired');
    
    // Query NFT details with explicit timeout
    const queryConfig = {
      text: `
        SELECT *
        FROM nft_metadata
        WHERE symbol = $1 AND name = $2
        LIMIT 1
      `,
      values: [collectionConfig.symbol, `${collectionConfig.name} #${tokenId}`],
      rowMode: 'array'
    };

    console.log('Executing NFT query:', {
      symbol: collectionConfig.symbol,
      name: `${collectionConfig.name} #${tokenId}`
    });
    
    const result = await Promise.race([
      client.query(queryConfig),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
    ]);

    console.log('Query result:', {
      rowCount: result.rows.length,
      firstRow: result.rows[0] ? {
        name: result.rows[0][result.fields.findIndex(f => f.name === 'name')],
        symbol: result.rows[0][result.fields.findIndex(f => f.name === 'symbol')],
        owner: result.rows[0][result.fields.findIndex(f => f.name === 'owner_wallet')]?.slice(0, 8)
      } : null
    });

    if (!result || result.rows.length === 0) {
      throw new Error(`NFT not found: ${collectionConfig.name} #${tokenId}`);
    }

    // Convert array row to object
    const nft = result.fields.reduce((obj, field, i) => {
      obj[field.name] = result.rows[0][i];
      return obj;
    }, {});

    // Build fields array based on available data
    const fields = [];

    // Owner field - prefer Discord name if available
    fields.push({
      name: 'Owner',
      value: nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : nft.owner_wallet
          ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
          : 'Unknown',
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
            url: nft.image_url || null
          },
          footer: {
            text: `${collectionConfig.name} • Mint: ${nft.mint_address || 'Unknown'}`
          }
        }]
      }
    };
  } catch (error) {
    console.error('NFT lookup error:', {
      collection,
      tokenId,
      error: error.message,
      stack: error.stack,
      code: error.code
    });
    
    // Handle specific errors
    if (error.message === 'Connection timeout') {
      throw new Error('The bot is warming up. Please try again in a few seconds.');
    }
    
    if (error.message === 'Query timeout') {
      throw new Error('The request took too long to process. Please try again.');
    }
    
    if (error.code === '57014') {
      throw new Error('The request took too long to process. Please try again.');
    }
    
    if (error.code === '3D000') {
      throw new Error('Database connection error. Please try again.');
    }
    
    throw error;
  } finally {
    if (client) {
      try {
        await client.release(true); // Force release
        console.log('Database connection released');
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

export async function handleNFTLookup(command) {
  console.log('Handling NFT lookup command:', command);
  
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command format');
  }

  const [collection, tokenIdStr] = command.split('.');
  const tokenId = parseInt(tokenIdStr);

  if (!collection || isNaN(tokenId)) {
    throw new Error('Invalid command format. Use: collection.tokenId (e.g., cat.1073)');
  }

  return getNFTDetails(collection, tokenId);
} 