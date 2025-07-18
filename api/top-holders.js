import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { pool } from './config/database.js';
import fetch from 'node-fetch';
import { getSolPrice } from './utils/solPrice.js';

// Map collection symbols to Magic Eden slugs
const COLLECTION_SLUGS = {
  'FCKEDCATZ': 'fcked_catz',
  'MM': 'money_monsters',
  'AIBB': 'ai_bitbots',
  'MM3D': 'moneymonsters3d',
  'CelebCatz': 'celebcatz',
  'SHxBB': 'ai_warriors',
  'AUSQRL': 'ai_secret_squirrels',
  'AELxAIBB': 'ai_energy_apes',
  'AIRB': 'rejected_bots_ryc',
  'CLB': 'candybots',
  'DDBOT': 'doodlebots'
};

// Move these mappings to top-level scope
const dbSymbols = {
  'fckedcatz': 'FCKEDCATZ',
  'mm': 'MM',
  'aibb': 'AIBB',
  'mm3d': 'MM3D',
  'celebcatz': 'CelebCatz',
  'shxbb': 'SHxBB',
  'ausqrl': 'AUSQRL',
  'aelxaibb': 'AELxAIBB',
  'airb': 'AIRB',
  'clb': 'CLB',
  'ddbot': 'DDBOT'
};

const collectionCountsColumns = {
  'FCKEDCATZ': 'fcked_catz_count',
  'MM': 'money_monsters_count',
  'AIBB': 'aibitbots_count',
  'MM3D': 'money_monsters_3d_count',
  'CelebCatz': 'celeb_catz_count',
  'SHxBB': 'ai_warriors_count',
  'AUSQRL': 'ai_secret_squirrels_count',
  'AELxAIBB': 'ai_energy_apes_count',
  'AIRB': 'rejected_bots_ryc_count',
  'CLB': 'candybots_count',
  'DDBOT': 'doodlebots_count'
};

const MAGICEDEN_TO_DB_SYMBOL = {
  'fcked_catz': 'FCKEDCATZ',
  'money_monsters': 'MM',
  'ai_bitbots': 'AIBB',
  'moneymonsters3d': 'MM3D',
  'celebcatz': 'CelebCatz',
  'ai_warriors': 'SHxBB',
  'ai_secret_squirrels': 'AUSQRL',
  'ai_energy_apes': 'AELxAIBB',
  'rejected_bots_ryc': 'AIRB',
  'candybots': 'CLB',
  'doodlebots': 'DDBOT'
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let client;
  try {
    const type = req.query.type || 'bux';
    const collection = req.query.collection || 'all';

    console.log(`[DEBUG] Received collection parameter: ${collection}`);
    const allCollectionSymbols = ['FCKEDCATZ', 'MM', 'AIBB', 'MM3D', 'CelebCatz', 'SHxBB', 'AUSQRL', 'AELxAIBB', 'AIRB', 'CLB', 'DDBOT'];
    const validCollections = allCollectionSymbols.map(symbol => symbol.toLowerCase());
    console.log(`[DEBUG] Backend valid collections list: ${validCollections.join(', ')}`);

    const PROJECT_WALLET = 'CatzBPyMJcQgnAZ9hCtSNzDTrLLsRxerJYwh5LMe87kY';
    const ME_ESCROW = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';

    // Get client from pool
    client = await pool.connect();

    // Get SOL price from cache or fetch if not available or expired
    let solPrice = await getSolPrice();
    
    console.log('[DEBUG] SOL price fetched:', solPrice);

    // If solPrice is still null/undefined after attempting fetch/cache, something is wrong
    if (!solPrice) {
      console.error('[DEBUG] SOL price is null/undefined, returning error');
      return res.status(500).json({
        error: 'SOL price not available for value calculation.',
        message: 'Could not fetch or retrieve SOL price.'
      });
    }

    // Get collection floor prices from Magic Eden
    let floorPrices = {};
    try {
        // Only fetch floor prices for relevant collections
        let relevantSymbols = allCollectionSymbols;
        if (type === 'nfts' && collection !== 'all') {
          const dbSymbol = dbSymbols[collection];
          if (dbSymbol) relevantSymbols = [dbSymbol];
        }
        const floorPricePromises = relevantSymbols.map(async (dbSymbol) => {
            const slug = COLLECTION_SLUGS[dbSymbol]; // Use slug as canonical key
            if (!slug) {
                if (process.env.NODE_ENV === 'development') {
                  console.warn(`No Magic Eden slug found for ${dbSymbol}`);
                }
                return { slug, floorPrice: 0 };
            }

            try {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Collections] Attempting to fetch stats from Magic Eden for symbol: ${slug}`);
                }
                const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${slug}/stats`);
                if (!response.ok) {
                    if (process.env.NODE_ENV === 'development') {
                      console.error(`Failed to fetch floor price for ${slug}: ${response.statusText}`);
                    }
                    return { slug, floorPrice: 0 };
                }
                const data = await response.json();
                if (process.env.NODE_ENV === 'development') {
                  console.log(`[Collections] Received data from Magic Eden for ${slug}:`, data);
                }
                if (!data.floorPrice) {
                    if (process.env.NODE_ENV === 'development') {
                      console.log(`[Collections] Magic Eden response missing floorPrice for ${slug}:`, data);
                    }
                    return { slug, floorPrice: 0 };
                }

                const floorPrice = Number(data.floorPrice || 0) / LAMPORTS_PER_SOL;
                if (isNaN(floorPrice)) {
                    if (process.env.NODE_ENV === 'development') {
                      console.error(`Invalid floor price data for ${slug}:`, data);
                    }
                    return { slug, floorPrice: 0 };
                }
                return { slug, floorPrice };
            } catch (error) {
                if (process.env.NODE_ENV === 'development') {
                  console.error(`Error fetching floor price for ${slug}:`, error);
                }
                return { slug, floorPrice: 0 };
            }
        });

        const results = await Promise.allSettled(floorPricePromises);
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                floorPrices[result.value.slug] = result.value.floorPrice;
            } else {
                if (process.env.NODE_ENV === 'development') {
                  console.error(`Promise failed for fetching floor price:`, result.reason);
                }
            }
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('Fetched floor prices:', floorPrices);
        }

    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error fetching floor prices:', error);
        }
        floorPrices = {};
    }

    if (type === 'bux,nfts') {
      // Aggregate by discord_id: get NFTs from collection_counts, BUX from bux_holders
      const combinedResult = await client.query(`
        SELECT
          cc.discord_id,
          cc.discord_name,
          cc.total_count AS nfts,
          COALESCE(SUM(bh.balance), 0) AS bux_balance,
          cc.fcked_catz_count,
          cc.money_monsters_count,
          cc.aibitbots_count,
          cc.money_monsters_3d_count,
          cc.celeb_catz_count,
          cc.ai_warriors_count,
          cc.ai_secret_squirrels_count,
          cc.ai_energy_apes_count,
          cc.rejected_bots_ryc_count,
          cc.candybots_count,
          cc.doodlebots_count
        FROM collection_counts cc
        LEFT JOIN bux_holders bh ON bh.owner_discord_id = cc.discord_id
        GROUP BY cc.discord_id, cc.discord_name, cc.total_count, 
                 cc.fcked_catz_count, cc.money_monsters_count, cc.aibitbots_count,
                 cc.money_monsters_3d_count, cc.celeb_catz_count, cc.ai_warriors_count,
                 cc.ai_secret_squirrels_count, cc.ai_energy_apes_count,
                 cc.rejected_bots_ryc_count, cc.candybots_count, cc.doodlebots_count
        HAVING cc.total_count > 0 OR COALESCE(SUM(bh.balance), 0) > 0
      `);

      // Calculate total value for each holder based on their NFT holdings
      const holders = combinedResult.rows
        .map(row => {
          // Calculate total SOL value based on NFT holdings and floor prices
          const totalSolValue = 
            (row.fcked_catz_count * (floorPrices['fcked_catz'] || 0)) +
            (row.money_monsters_count * (floorPrices['money_monsters'] || 0)) +
            (row.aibitbots_count * (floorPrices['ai_bitbots'] || 0)) +
            (row.money_monsters_3d_count * (floorPrices['moneymonsters3d'] || 0)) +
            (row.celeb_catz_count * (floorPrices['celebcatz'] || 0)) +
            (row.ai_warriors_count * (floorPrices['ai_warriors'] || 0)) +
            (row.ai_secret_squirrels_count * (floorPrices['ai_secret_squirrels'] || 0)) +
            (row.ai_energy_apes_count * (floorPrices['ai_energy_apes'] || 0)) +
            (row.rejected_bots_ryc_count * (floorPrices['rejected_bots_ryc'] || 0)) +
            (row.candybots_count * (floorPrices['candybots'] || 0)) +
            (row.doodlebots_count * (floorPrices['doodlebots'] || 0));

          const usdValue = totalSolValue * solPrice;

          return {
            discord_id: row.discord_id,
            discord_username: row.discord_name,
            nfts: `${row.nfts} NFTs`,
            bux: Number(row.bux_balance).toLocaleString(),
            value: `${totalSolValue.toFixed(2)} SOL ($${usdValue.toFixed(2)})`,
            totalValue: totalSolValue // Add this for sorting
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue); // Sort by SOL value descending

      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).json({ holders });
    }

    if (type === 'nfts') {
      console.log('Processing NFT holders request:', { collection, type });
      
      // Validate collection parameter - update validation to include collaboration collections
      console.log(`[DEBUG] Before validation - received collection: ${collection}`);
      const validCollections = allCollectionSymbols.map(symbol => symbol.toLowerCase());
      console.log(`[DEBUG] Before validation - validCollections array: ${validCollections.join(', ')}`);
      if (collection !== 'all' && !validCollections.includes(collection)) {
        return res.status(400).json({
          error: 'Invalid collection parameter',
          message: `Collection must be one of: all, ${validCollections.join(', ')}`
        });
      }
      
      // Map frontend names to DB symbols - include collaboration collections
      const dbSymbols = {
        'fckedcatz': 'FCKEDCATZ',
        'mm': 'MM',
        'aibb': 'AIBB',
        'mm3d': 'MM3D',
        'celebcatz': 'CelebCatz',
        'shxbb': 'SHxBB',
        'ausqrl': 'AUSQRL',
        'aelxaibb': 'AELxAIBB',
        'airb': 'AIRB',
        'clb': 'CLB',
        'ddbot': 'DDBOT'
      };

      // Map DB symbols to collection_counts column names
      const collectionCountsColumns = {
          'FCKEDCATZ': 'fcked_catz_count',
          'MM': 'money_monsters_count',
          'AIBB': 'aibitbots_count',
          'MM3D': 'money_monsters_3d_count',
          'CelebCatz': 'celeb_catz_count',
          'SHxBB': 'ai_warriors_count', // New column
          'AUSQRL': 'ai_secret_squirrels_count', // New column
          'AELxAIBB': 'ai_energy_apes_count', // New column
          'AIRB': 'rejected_bots_ryc_count', // New column
          'CLB': 'candybots_count', // New column
          'DDBOT': 'doodlebots_count' // New column
          // Note: total_count and ai_collabs_count are also in collection_counts
      };

      // Create the list of available collections for the dropdown
      const availableCollections = [
        { value: 'all', label: 'All Collections' },
        ...allCollectionSymbols.map(symbol => ({ value: symbol.toLowerCase(), label: symbol }))
      ];

      try {
        // Validate database connection
        if (!client) {
          throw new Error('Database connection not available');
        }

        // Get NFT counts
        const dbSymbol = collection !== 'all' ? dbSymbols[collection] : null;
        console.log('Using DB symbol:', dbSymbol);
        console.log('Project wallet:', PROJECT_WALLET);
        console.log('ME escrow:', ME_ESCROW);
        
        let query;
        let queryParams;

        if (dbSymbol) {
            // Use collection_counts table for specific collections
            const countColumn = collectionCountsColumns[dbSymbol];
            if (!countColumn) {
                // Should not happen if mappings are correct, but as a safeguard
                throw new Error(`No collection_counts column found for symbol: ${dbSymbol}`);
            }
            console.log(`[DEBUG] Using count column for ${dbSymbol}: ${countColumn}`);
            // We select the count for the specific collection and join with holders for discord info
            query = `
                SELECT
                  cc.wallet_address,
                  $3 as symbol, -- Pass the dbSymbol directly
                  cc.${countColumn} as count,
                  cc.${countColumn} as valid_count, -- Assuming counts in collection_counts are valid
                  cc.discord_name as discord_username
                FROM collection_counts cc
                WHERE cc.${countColumn} > 0
                AND cc.wallet_address NOT IN ($1, $2)
            `;
            queryParams = [PROJECT_WALLET, ME_ESCROW, dbSymbol];
            console.log(`[DEBUG] Query for specific collection:`, { query, queryParams });
        } else {
            // Use collection_counts for 'all' collections
            query = `
                SELECT
                  cc.wallet_address as owner_wallet,
                  'all' as symbol,
                  cc.total_count as count,
                  cc.total_count as valid_count,
                  cc.discord_name as discord_username,
                  cc.fcked_catz_count,
                  cc.money_monsters_count,
                  cc.aibitbots_count,
                  cc.money_monsters_3d_count,
                  cc.celeb_catz_count,
                  cc.ai_warriors_count,
                  cc.ai_secret_squirrels_count,
                  cc.ai_energy_apes_count,
                  cc.rejected_bots_ryc_count,
                  cc.candybots_count,
                  cc.doodlebots_count
                FROM collection_counts cc
                WHERE cc.total_count > 0
                AND cc.wallet_address NOT IN ($1, $2)
            `;
            queryParams = [PROJECT_WALLET, ME_ESCROW];
            console.log(`[DEBUG] Query for all collections:`, { query, queryParams });
        }

        console.log('Executing query:', {
          query,
          params: queryParams
        });

        const nftResult = await client.query(query, queryParams);

        console.log('[DEBUG] Raw NFT query result rows:', nftResult.rows);
        console.log('[DEBUG] Number of rows returned:', nftResult.rows.length);
        if (nftResult.rows.length > 0) {
            console.log('[DEBUG] First row sample:', nftResult.rows[0]);
        }

        if (!nftResult || !Array.isArray(nftResult.rows)) {
          throw new Error('Invalid query result structure');
        }

        // Log solPrice before formatting the final output string
        console.log(`[DEBUG] Before formatting - solPrice: ${solPrice}`);

        console.log('NFT query result rows:', nftResult.rows.length);
        console.log('Sample NFT data:', nftResult.rows.slice(0, 3));

        // Calculate totals
        const totals = {};
        console.log('[DEBUG] Starting to calculate totals. Raw rows count:', nftResult.rows.length);
        for (const row of nftResult.rows) {
          // If we queried collection_counts for a specific symbol, the row structure is simpler
          if (dbSymbol) {
              const { wallet_address, count, valid_count, discord_username } = row;
               // Ensure count is a number
               const numericCount = Number(count);
               console.log('[DEBUG] Processing row (single collection):', { wallet: wallet_address, count: numericCount, dbSymbol, row });
               if (isNaN(numericCount) || numericCount <= 0) continue;

               // Use the Magic Eden slug for floor price lookup
               const slug = COLLECTION_SLUGS[dbSymbol];
               const floorPrice = (slug && floorPrices[slug]) || 0;
               
               if (process.env.NODE_ENV === 'development') {
                 if (!slug) {
                    console.warn(`[DEBUG] No Magic Eden slug found for DB symbol: ${dbSymbol}`);
                 } else if (!(slug in floorPrices)) {
                    console.warn(`[DEBUG] No floor price found for slug: ${slug} (DB symbol: ${dbSymbol})`);
                 }
               }

               totals[wallet_address] = {
                   nfts: numericCount,
                   value: numericCount * floorPrice,
                   discord_username: discord_username || null,
                   symbol: dbSymbol.toLowerCase() // Add symbol for dropdown
               };
               console.log('[DEBUG] Processed holder (single collection):', { wallet: wallet_address, count: numericCount, floorPrice, value: totals[wallet_address].value });

          } else { // Original logic for 'all' collections
              const { owner_wallet, symbol, valid_count, discord_username, 
                      fcked_catz_count, money_monsters_count, aibitbots_count,
                      money_monsters_3d_count, celeb_catz_count, ai_warriors_count,
                      ai_secret_squirrels_count, ai_energy_apes_count,
                      rejected_bots_ryc_count, candybots_count, doodlebots_count } = row;
              
              if (!owner_wallet || !symbol || valid_count === undefined) {
                console.warn('Skipping invalid row:', row);
                continue;
              }

              // Calculate total value by summing individual collection values
              const collectionValues = {
                'FCKEDCATZ': fcked_catz_count * (floorPrices['fcked_catz'] || 0),
                'MM': money_monsters_count * (floorPrices['money_monsters'] || 0),
                'AIBB': aibitbots_count * (floorPrices['ai_bitbots'] || 0),
                'MM3D': money_monsters_3d_count * (floorPrices['moneymonsters3d'] || 0),
                'CelebCatz': celeb_catz_count * (floorPrices['celebcatz'] || 0),
                'SHxBB': ai_warriors_count * (floorPrices['ai_warriors'] || 0),
                'AUSQRL': ai_secret_squirrels_count * (floorPrices['ai_secret_squirrels'] || 0),
                'AELxAIBB': ai_energy_apes_count * (floorPrices['ai_energy_apes'] || 0),
                'AIRB': rejected_bots_ryc_count * (floorPrices['rejected_bots_ryc'] || 0),
                'CLB': candybots_count * (floorPrices['candybots'] || 0),
                'DDBOT': doodlebots_count * (floorPrices['doodlebots'] || 0)
              };

              const totalValue = Object.values(collectionValues).reduce((sum, value) => sum + value, 0);

              totals[owner_wallet] = {
                nfts: Number(valid_count),
                value: totalValue,
                discord_username: discord_username || null,
                symbol: 'all'
              };

              console.log('[DEBUG] Processed holder (all collections):', {
                wallet: owner_wallet,
                totalNFTs: valid_count,
                collectionValues,
                totalValue,
                discordUsername: discord_username
              });
          }
        }

        console.log('[DEBUG] Finished calculating totals. Totals object keys count:', Object.keys(totals).length);

        if (Object.keys(totals).length === 0) {
          console.warn('No valid holders found');
          return res.status(200).json({ holders: [], availableCollections });
        }

        console.log('Processed totals:', {
          totalHolders: Object.keys(totals).length,
          sampleHolder: Object.entries(totals)[0]
        });

        // Format response
        const holders = Object.entries(totals)
          .filter(([wallet, data]) => wallet && data.nfts > 0)
          .map(([wallet, data]) => ({
            address: wallet.slice(0, 4) + '...' + wallet.slice(-4),
            discord_username: data.discord_username || null,
            amount: `${data.nfts} NFTs`,
            value: `${data.value.toFixed(2)} SOL ($${solPrice !== null && !isNaN(solPrice) ? (data.value * solPrice).toFixed(2) : 'NaN'})`,
            symbol: data.symbol // Add symbol for frontend dropdown
          }))
          .sort((a, b) => {
            const valueA = parseFloat(a.value.split(' ')[0]);
            const valueB = parseFloat(b.value.split(' ')[0]);
            return valueB - valueA;
          });

        console.log('Formatted holders:', {
          count: holders.length,
          sample: holders.slice(0, 3)
        });

        console.log('[DEBUG] Finished formatting holders. Formatted holders count:', holders.length);

        if (holders.length === 0) {
          console.warn('No holders after formatting');
          return res.status(200).json({ holders: [], availableCollections });
        }

        res.setHeader('Cache-Control', 'public, s-maxage=60');
        
        // Include list of all valid collections in the response
        return res.status(200).json({ holders, availableCollections });
      } catch (error) {
        console.error('Error processing NFT holders:', error);
        return res.status(500).json({ 
          error: 'Error processing NFT holders',
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }

    if (type === 'bux') {
      // Get BUX holders and total supply
      const result = await client.query(`
        WITH total_supply AS (
          SELECT SUM(balance) as total_supply,
                 SUM(CASE WHEN is_exempt = FALSE THEN balance ELSE 0 END) as public_supply
          FROM bux_holders
        )
        SELECT 
          wallet_address as address,
          owner_name as discord_name,
          balance as amount,
          is_exempt,
          ROUND((balance * 100.0 / (
            SELECT SUM(balance) FROM bux_holders WHERE is_exempt = FALSE
          )), 2) as percentage,
          (SELECT public_supply FROM total_supply) as public_supply
        FROM bux_holders 
        WHERE is_exempt = FALSE
        ORDER BY balance DESC
      `);

      // Get LP balance for token value calculation
      const lpWalletAddress = new PublicKey('3WNHW6sr1sQdbRjovhPrxgEJdWASZ43egGWMMNrhgoRR');
      let lpBalance = 32.380991533 * LAMPORTS_PER_SOL; // Default value

      try {
        const connection = new Connection('https://api.mainnet-beta.solana.com');
        const balance = await connection.getBalance(lpWalletAddress);
        if (balance !== null) {
          lpBalance = balance;
        }
      } catch (error) {
        console.error('Error fetching LP balance:', error);
      }

      const lpBalanceInSol = (lpBalance / LAMPORTS_PER_SOL) + 20.2;
      const publicSupply = Number(result.rows[0]?.public_supply) || 1;
      const tokenValueInSol = lpBalanceInSol / publicSupply;
      
      console.log('[DEBUG] BUX calculation values:', {
        lpBalanceInSol,
        publicSupply,
        tokenValueInSol,
        solPrice
      });

      // Format BUX holders - use new format to match frontend expectations
      const holders = result.rows.map(holder => {
        const holderBalance = Number(holder.amount);
        const valueInSol = holderBalance * tokenValueInSol;
        
        // Ensure solPrice is valid for USD calculation
        let valueInUsd = 0;
        if (solPrice !== null && !isNaN(solPrice) && solPrice > 0) {
          valueInUsd = valueInSol * solPrice;
        }

        return {
          discord_id: holder.discord_id || holder.address, // Use address as fallback
          discord_username: holder.discord_name || holder.address.slice(0, 4) + '...' + holder.address.slice(-4),
          nfts: "0 NFTs", // BUX holders don't have NFTs in this view
          bux: holderBalance.toLocaleString(),
          percentage: Number(holder.percentage).toFixed(2),
          value: `${valueInSol < 0.01 ? valueInSol.toFixed(6) : valueInSol.toFixed(2)} SOL ($${valueInUsd > 0 ? valueInUsd.toFixed(2) : '0.00'})`
        };
      });

      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).json({ holders });
    }

    return res.status(400).json({ error: 'Invalid type parameter' });

  } catch (error) {
    console.error('Error in top holders endpoint:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
}
