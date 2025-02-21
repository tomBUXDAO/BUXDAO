import { pool } from '../config/database.js';

// Collection configurations (only collections with rarity)
const COLLECTIONS = {
  'cat': {
    name: 'Fcked Cat',
    symbol: 'FCKEDCATZ',
    hasRarity: true,
    logo: '/logos/cat.PNG',
    color: 0xFFF44D // Yellow
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
  }
};

export default async function handler(req, res) {
  console.log('Rank lookup request:', {
    method: req.method,
    body: req.body,
    headers: req.headers,
    url: req.url
  });

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  const { collection, symbol, rank } = req.body;
  console.log('Request parameters:', { 
    collection, 
    symbol, 
    rank, 
    typeRank: typeof rank,
    typeCollection: typeof collection,
    typeSymbol: typeof symbol
  });

  if (!collection || !symbol || rank === undefined) {
    return res.status(400).json({
      error: 'Missing required parameters',
      message: 'Collection, symbol, and rank are required',
      received: { collection, symbol, rank }
    });
  }

  const collectionConfig = COLLECTIONS[collection];
  if (!collectionConfig) {
    return res.status(400).json({
      error: 'Invalid collection',
      message: `Collection "${collection}" not found. Available collections: ${Object.keys(COLLECTIONS).join(', ')}`
    });
  }

  if (!collectionConfig.hasRarity) {
    return res.status(400).json({
      error: 'Collection does not support rarity',
      message: `Collection "${collectionConfig.name}" does not support rarity ranking`
    });
  }

  let client;
  try {
    client = await pool.connect();
    console.log('Looking up NFT by rank:', { collection, symbol, rank });

    // First, check if the rank exists
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM nft_metadata 
      WHERE symbol = $1 AND rarity_rank = $2
    `;
    const countResult = await client.query(countQuery, [symbol, rank]);
    console.log('Count result:', countResult.rows[0]);

    if (parseInt(countResult.rows[0].count) === 0) {
      return res.status(404).json({
        error: 'NFT not found',
        message: `No NFT found with rank #${rank} in ${collectionConfig.name}`
      });
    }

    // Get the NFT details
    const result = await client.query(
      `SELECT * 
       FROM nft_metadata 
       WHERE symbol = $1 
       AND rarity_rank = $2 
       LIMIT 1`,
      [symbol, rank]
    );

    console.log('Query result:', {
      found: result.rows.length > 0,
      firstRow: result.rows[0] ? {
        name: result.rows[0].name,
        owner: result.rows[0].owner_wallet,
        mint: result.rows[0].mint_address,
        rank: result.rows[0].rarity_rank
      } : null
    });

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'NFT not found',
        message: `No NFT found with rank #${rank} in ${collectionConfig.name}`
      });
    }

    const nft = result.rows[0];

    // Build fields array based on available data
    const fields = [];

    // Owner field - prefer Discord name if available
    fields.push({
      name: '👤 Owner',
      value: nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : nft.owner_wallet
          ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
          : 'Unknown',
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

    // Always show rarity rank since these collections have it
    fields.push({
      name: '✨ Rarity Rank',
      value: `#${nft.rarity_rank}`,
      inline: true
    });

    return res.status(200).json({
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
    });
  } catch (error) {
    console.error('Error looking up NFT by rank:', error);
    return res.status(500).json({
      error: 'Database error',
      message: error.message,
      details: {
        collection,
        symbol,
        rank,
        errorName: error.name,
        errorCode: error.code
      }
    });
  } finally {
    if (client) {
      await client.release();
    }
  }
} 