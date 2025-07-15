import { pool } from '../../../config/database.js';
import fetch from 'node-fetch';
import collectionsConfig from '../../../../buxdao-nft-sync/collections.config.js';

// Reward rates per collection (should match your config)
const REWARD_RATES = {
  'CelebCatz': 20,
  'MM3D': 7,
  'FCKEDCATZ': 5,
  'MM': 5,
  'AIBB': 3,
  'AELxAIBB': 1,
  'AIRB': 1,
  'AUSQRL': 1,
  'DDBOT': 1,
  'CLB': 1
};

// Magic Eden and Tensor URL templates
const ME_URL = symbol => `https://magiceden.io/marketplace/${symbol.toLowerCase()}`;
const TENSOR_URL = symbol => `https://www.tensor.trade/trade/${symbol.toLowerCase()}`;

// Map DB symbol to Magic Eden API symbol
const magicEdenSymbolMap = {
  'FCKEDCATZ': 'fcked_catz',
  'MM': 'money_monsters',
  'AIBB': 'ai_bitbots',
  'MM3D': 'moneymonsters3d',
  'CelebCatz': 'celebcatz',
  'AELxAIBB': 'ai_energy_apes',
  'AIRB': 'rejected_bots_ryc',
  'AUSQRL': 'ai_secret_squirrels',
  'DDBOT': 'doodlebots',
  'CLB': 'candybots'
};

// Map collection symbol to display name
const COLLECTION_DISPLAY_NAMES = {
  'FCKEDCATZ': 'Fcked Catz',
  'MM': 'Money Monsters',
  'AIBB': 'A.I. BitBots',
  'MM3D': 'Money Monsters 3D',
  'CelebCatz': 'Celebrity Catz',
  'AELxAIBB': 'A.I. Energy Apes',
  'AIRB': 'Rejected Bots',
  'AUSQRL': 'A.I. Secret Squirrels',
  'DDBOT': 'Doodle Bots',
  'CLB': 'Candy Bots',
  'SHxBB': 'A.I. Warriors'
};

// Map collection symbol to thumbnail image (relative to public/)
const COLLECTION_THUMBNAILS = {
  'FCKEDCATZ': '/gifs/catz.gif',
  'MM': '/gifs/mm.gif',
  'AIBB': '/gifs/bitbot.gif',
  'MM3D': '/gifs/mm3d.gif',
  'CelebCatz': '/gifs/celebs.gif',
  'AELxAIBB': '/collab-images/ai-apes.jpg',
  'AIRB': '/collab-images/rejected-bots.jpg',
  'AUSQRL': '/collab-images/ai-squirrels.jpg',
  'DDBOT': '/collab-images/doodlebots.jpg',
  'CLB': '/collab-images/candybots.jpg',
  'SHxBB': '/collab-images/ai-warriors.jpg'
};

/**
 * Handler for the /collections command
 * @param {Object} options - Command options
 * @param {string} options.collectionSymbol - Symbol of the collection
 * @returns {Promise<Object>} Discord embed response
 */
export async function handleCollections({ collectionSymbol }) {
  const config = collectionsConfig.find(c => c.name === collectionSymbol);
  if (!config) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Invalid Collection',
          description: `Collection not found: ${collectionSymbol}`,
          color: 0xFF0000
        }],
        flags: 0
      }
    };
  }
  let client;
  try {
    client = await pool.connect();
    // Get DB stats
    const totalSupplyResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1',
      [collectionSymbol]
    );
    const totalSupply = parseInt(totalSupplyResult.rows[0]?.count || 0, 10);
    const listedCountResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1 AND is_listed = TRUE',
      [collectionSymbol]
    );
    const listedCount = parseInt(listedCountResult.rows[0]?.count || 0, 10);
    // Fetch floor price from Magic Eden
    let floorPrice = 0;
    const meSymbol = magicEdenSymbolMap[collectionSymbol];
    if (meSymbol) {
      try {
        const meResponse = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${meSymbol}/stats`);
        if (meResponse.ok) {
          const meData = await meResponse.json();
          if (meData && typeof meData.floorPrice !== 'undefined') {
            floorPrice = meData.floorPrice;
          }
        }
      } catch (e) {}
    }
    // Fetch SOL price for USD conversion
    let solPrice = 0;
    try {
      const metricsRes = await fetch('https://buxdao.com/api/token-metrics');
      const metrics = await metricsRes.json();
      solPrice = metrics.solPrice || 0;
    } catch (e) {
      solPrice = 0;
    }
    // Calculate % listed
    const percentListed = totalSupply > 0 ? ((listedCount / totalSupply) * 100).toFixed(2) : '0.00';
    // Daily reward yield
    const dailyReward = REWARD_RATES[collectionSymbol] || 0;
    // Thumbnail
    const thumbnailUrl = COLLECTION_THUMBNAILS[collectionSymbol] ? `https://buxdao.com${COLLECTION_THUMBNAILS[collectionSymbol]}` : undefined;
    // Format floor price (Magic Eden returns in lamports, so divide by 1e9 for SOL)
    let formattedFloorPrice = floorPrice;
    if (floorPrice > 1e6) {
      formattedFloorPrice = (floorPrice / 1e9).toFixed(2);
    } else if (floorPrice > 0) {
      formattedFloorPrice = floorPrice.toFixed(2);
    } else {
      formattedFloorPrice = '0';
    }
    // Add USD value in brackets if possible
    let floorPriceUsd = '';
    if (solPrice && !isNaN(solPrice)) {
      floorPriceUsd = ` ($${(parseFloat(formattedFloorPrice) * solPrice).toFixed(2)})`;
    }
    // Format fields in two columns: left (main stats), right (bonus stats)
    const leftFields = [
      { name: 'Total NFTs', value: totalSupply.toString(), inline: true },
      { name: 'Listed', value: listedCount.toString(), inline: true },
      { name: 'Floor Price', value: `${formattedFloorPrice} SOL${floorPriceUsd}`, inline: true }
    ];
    const rightFields = [
      { name: '% Listed', value: `${percentListed}%`, inline: true },
      { name: 'Daily Reward', value: `${dailyReward} BUX/NFT/day`, inline: true }
    ];
    // Links at the bottom (show full URLs)
    const meUrl = ME_URL(meSymbol || collectionSymbol);
    const tensorUrl = TENSOR_URL(meSymbol || collectionSymbol);
    const linkFields = [
      { name: 'Magic Eden', value: meUrl, inline: false },
      { name: 'Tensor', value: tensorUrl, inline: false }
    ];
    // Build embed
    return {
      type: 4,
      data: {
        embeds: [{
          title: `${COLLECTION_DISPLAY_NAMES[collectionSymbol] || collectionSymbol} Collection Stats`,
          color: 0x4CAF50,
          thumbnail: thumbnailUrl ? { url: thumbnailUrl } : undefined,
          fields: [...leftFields, ...rightFields, ...linkFields],
          footer: { text: 'BUXDAO - Collection Stats' },
          timestamp: new Date().toISOString()
        }],
        flags: 0
      }
    };
  } catch (error) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Database Error',
          description: 'An error occurred while fetching collection stats.',
          color: 0xFF0000
        }],
        flags: 0
      }
    };
  } finally {
    if (client) client.release();
  }
} 