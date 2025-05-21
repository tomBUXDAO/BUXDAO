import express from 'express';
import fetch from 'node-fetch';
import { pool } from '../config/database.js'; // Import the pool directly

const router = express.Router();

// Mapping of your database symbols to Magic Eden API symbols
const magicEdenSymbolMap = {
  // Main Collections
  'FCKEDCATZ': 'fcked_catz',
  'MM': 'money_monsters',
  'AIBB': 'ai_bitbots',
  'MM3D': 'moneymonsters3d',
  'CelebCatz': 'celebcatz',

  // Collab Collections (Database Symbol: Magic Eden Symbol)
  'SHxBB': 'ai_warriors',
  'AUSQRL': 'ai_secret_squirrels',
  'AELxAIBB': 'ai_energy_apes',
  'AIRB': 'rejected_bots_ryc',
  'CLB': 'candybots',
  'DDBOT': 'doodlebots',
};

// Define the route to get collection stats
router.get('/:collection/stats', async (req, res) => {
  let client; // Declare client variable
  const { collection: dbSymbol } = req.params; // Use 'dbSymbol' for clarity
  console.log('[Collections] Fetching stats for collection (DB symbol):', dbSymbol);

  // Get the corresponding Magic Eden symbol
  const meSymbol = magicEdenSymbolMap[dbSymbol];

  if (!meSymbol) {
    console.warn('[Collections] No Magic Eden symbol found for DB symbol:', dbSymbol);

    // Return data from DB only if ME symbol is not found
    try {
      client = await pool.connect();

      const totalSupplyResult = await client.query(
        'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1',
        [dbSymbol]
      );
      const totalSupply = totalSupplyResult.rows[0]?.count || 0;

      const listedCountResult = await client.query(
        'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1 AND is_listed = TRUE',
        [dbSymbol]
      );
      const listedCount = listedCountResult.rows[0]?.count || 0;

      // Return 0 for floor price as ME symbol is unknown
      return res.status(200).json({
        symbol: dbSymbol,
        totalSupply: parseInt(totalSupply, 10),
        listedCount: parseInt(listedCount, 10),
        floorPrice: 0,
        warning: `No Magic Eden symbol mapping for ${dbSymbol}`
      });
    } catch (dbError) {
      console.error('[Collections] Error fetching DB stats when ME symbol not found:', dbError);

      return res.status(200).json({
        symbol: dbSymbol,
        totalSupply: 0,
        listedCount: 0,
        floorPrice: 0,
        error: `Failed to fetch DB stats for ${dbSymbol}`
      });
    } finally {
      if (client) client.release();
    }
  }

  try {
    client = await pool.connect();
    console.log('[Collections] Client acquired from pool for ' + dbSymbol);

    // --- Fetch data from the database (Supply and Listed Count) ---
    const totalSupplyResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1',
      [dbSymbol]
    );
    const totalSupply = totalSupplyResult.rows[0]?.count || 0; // Default to 0 if no rows

    const listedCountResult = await client.query(
      'SELECT COUNT(*) FROM nft_metadata WHERE symbol = $1 AND is_listed = TRUE',
      [dbSymbol]
    );
    const listedCount = listedCountResult.rows[0]?.count || 0; // Default to 0 if no rows

    // --- Fetch Floor Price from Magic Eden API (using ME symbol) ---
    let magicEdenFloorPrice = 0;
    try {
      console.log('[Collections] Attempting to fetch stats from Magic Eden for symbol:', meSymbol);
      const meResponse = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${meSymbol}/stats`);
      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log('[Collections] Received data from Magic Eden for ' + meSymbol + ':', meData);
        // Check if floorPrice exists in the response
        if (meData && typeof meData.floorPrice !== 'undefined') {
          magicEdenFloorPrice = meData.floorPrice; // Use floorPrice from Magic Eden
        } else {
          console.warn('[Collections] Magic Eden response missing floorPrice for ' + meSymbol + ':', meData);
        }
      } else {
        console.warn('[Collections] Magic Eden API returned non-ok status for stats ' + meSymbol + ':', meResponse.status);
      }
    } catch (meError) {
      console.error('[Collections] Error fetching stats from Magic Eden for ' + meSymbol + ':', meError);
      // magicEdenFloorPrice remains 0 on error
    }

    // Add cache control headers
    res.setHeader('Cache-Control', 'public, s-maxage=60');

    // Combine and return the data
    return res.status(200).json({
      symbol: dbSymbol,
      totalSupply: parseInt(totalSupply, 10), // Ensure it's a number
      listedCount: parseInt(listedCount, 10), // Ensure it's a number
      floorPrice: magicEdenFloorPrice // Floor price from Magic Eden (or 0)
    });
  } catch (error) {
    console.error('[Collections] Error fetching stats (DB or ME) for ' + dbSymbol + ':', error);
    // Return default/zero values on any error
    return res.status(200).json({
      symbol: dbSymbol,
      totalSupply: 0,
      listedCount: 0,
      floorPrice: 0,
      error: 'Failed to fetch stats for ' + dbSymbol
    });
  } finally {
    // Always release the client back to the pool
    if (client) {
      client.release();
      console.log('[Collections] Client released to pool for ' + dbSymbol);
    }
  }
});

// It seems the Magic Eden stats route was defined here as well, let's remove it
// and rely on the database for supply/listed counts.
// router.get('/:collection/stats', async (req, res) => { ... }); // Remove or comment out this block

// If you have other collection-related routes, keep them here.

export default router; 