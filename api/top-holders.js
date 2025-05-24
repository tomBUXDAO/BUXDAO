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
  'CELEBCATZ': 'celebcatz',
  'SHXBB': 'ai_warriors',
  'AUSQRL': 'ai_secret_squirrels',
  'AELXAIBB': 'ai_energy_apes',
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
  'shxbb': 'SHXBB',
  'ausqrl': 'AUSQRL',
  'aelxaibb': 'AELXAIBB',
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
  'SHXBB': 'ai_warriors_count',
  'AUSQRL': 'ai_secret_squirrels_count',
  'AELXAIBB': 'ai_energy_apes_count',
  'AIRB': 'rejected_bots_ryc_count',
  'CLB': 'candybots_count',
  'DDBOT': 'doodlebots_count'
};

const MAGICEDEN_TO_DB_SYMBOL = {
  'fcked_catz': 'FCKEDCATZ',
  'money_monsters': 'MM',
  'ai_bitbots': 'AIBB',
  'moneymonsters3d': 'MM3D',
  'celebcatz': 'CELEBCATZ',
  'ai_warriors': 'SHXBB',
  'ai_secret_squirrels': 'AUSQRL',
  'ai_energy_apes': 'AELXAIBB',
  'rejected_bots_ryc': 'AIRB',
  'candybots': 'CLB',
  'doodlebots': 'DDBOT'
};

export default async function handler(req, res) {
  let client;
  try {
    const type = req.query.type || 'bux';
    const collection = req.query.collection || 'all';

    console.log(`[DEBUG] Received collection parameter: ${collection}`);
    const allCollectionSymbols = ['FCKEDCATZ', 'MM', 'AIBB', 'MM3D', 'CelebCatz', 'SHXBB', 'AUSQRL', 'AELXAIBB', 'AIRB', 'CLB', 'DDBOT'];
    const validCollections = allCollectionSymbols.map(symbol => symbol.toLowerCase());
    console.log(`[DEBUG] Backend valid collections list: ${validCollections.join(', ')}`);

    const PROJECT_WALLET = 'CatzBPyMJcQgnAZ9hCtSNzDTrLLsRxerJYwh5LMe87kY';
    const ME_ESCROW = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';

    // Get client from pool
    client = await pool.connect();

    // Get SOL price from cache or fetch if not available or expired
    let solPrice = getSolPrice();

    // If solPrice is still null/undefined after attempting fetch/cache, something is wrong
    if (!solPrice) {
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
      // Get BUX balances and total supply for token value calculation
      const buxResult = await client.query(`
        WITH total_supply AS (
          SELECT SUM(balance) as total_supply,
                 SUM(CASE WHEN is_exempt = FALSE THEN balance ELSE 0 END) as public_supply
          FROM bux_holders
        )
        SELECT 
          wallet_address,
          owner_name as discord_name,
          balance,
          is_exempt,
          (SELECT public_supply FROM total_supply) as public_supply
        FROM bux_holders 
        WHERE is_exempt = FALSE
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
      const publicSupply = Number(buxResult.rows[0]?.public_supply) || 1;
      const tokenValueInSol = lpBalanceInSol / publicSupply;
      
      // Get all NFT holdings
      const nftResult = await client.query(`
        SELECT owner_wallet, symbol, COUNT(*) as count
        FROM nft_metadata 
        WHERE owner_wallet NOT IN ($1, $2)
        AND owner_wallet IS NOT NULL 
        AND owner_wallet != ''
        GROUP BY owner_wallet, symbol
      `, [PROJECT_WALLET, ME_ESCROW]);

      // Combine holdings
      const combinedHoldings = {};
      
      // Add BUX holdings
      for (const holder of buxResult.rows) {
        const wallet = holder.wallet_address;
        const buxBalance = Number(holder.balance);
        const buxValue = buxBalance * tokenValueInSol;
        
        if (!combinedHoldings[wallet]) {
          combinedHoldings[wallet] = {
            address: holder.discord_name || wallet.slice(0, 4) + '...' + wallet.slice(-4),
            buxBalance: buxBalance,
            nftCount: 0,
            buxValue: buxValue,
            nftValue: 0
          };
        }
      }

      // Add NFT holdings
      for (const nft of nftResult.rows) {
        const wallet = nft.owner_wallet;
        if (!combinedHoldings[wallet]) {
          combinedHoldings[wallet] = {
            address: wallet.slice(0, 4) + '...' + wallet.slice(-4),
            buxBalance: 0,
            nftCount: 0,
            buxValue: 0,
            nftValue: 0
          };
        }
        combinedHoldings[wallet].nftCount += Number(nft.count);
        const dbSymbol = nft.symbol && nft.symbol.toUpperCase();
        const slug = COLLECTION_SLUGS[dbSymbol] || nft.symbol?.toLowerCase();
        if (process.env.NODE_ENV === 'development') {
          if (!(slug in floorPrices)) {
            console.warn(`No floor price found for slug: ${slug} (original: ${nft.symbol})`);
          }
        }
        combinedHoldings[wallet].nftValue += Number(nft.count) * (floorPrices[slug] || 0);
      }

      // Format and sort combined holdings
      const holders = Object.values(combinedHoldings)
        .map(holder => ({
          address: holder.address,
          bux: holder.buxBalance.toLocaleString(),
          nfts: `${holder.nftCount} NFTs`,
          value: `${(holder.buxValue + holder.nftValue).toFixed(2)} SOL ($${solPrice !== null && !isNaN(solPrice) ? ((holder.buxValue + holder.nftValue) * solPrice).toFixed(2) : 'NaN'})`
        }))
        .sort((a, b) => {
          const valueA = parseFloat(a.value.split(' ')[0]);
          const valueB = parseFloat(b.value.split(' ')[0]);
          return valueB - valueA;
        });

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
        'shxbb': 'SHXBB',
        'ausqrl': 'AUSQRL',
        'aelxaibb': 'AELXAIBB',
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
          'SHXBB': 'ai_warriors_count', // New column
          'AUSQRL': 'ai_secret_squirrels_count', // New column
          'AELXAIBB': 'ai_energy_apes_count', // New column
          'AIRB': 'rejected_bots_ryc_count', // New column
          'CLB': 'candybots_count', // New column
          'DDBOT': 'doodlebots_count' // New column
          // Note: total_count and ai_collabs_count are also in collection_counts
      };

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
            // We select the count for the specific collection and join with holders for discord info
            // Note: discord_id and discord_name are available in collection_counts as well, might simplify if we use that directly
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
        } else {
            // Use nft_metadata for \'all\' collections (original logic)
            // We could potentially sum counts from collection_counts here too, but keeping original logic for \'all\'
            query = `
                SELECT
                  owner_wallet,
                  symbol,
                  COUNT(*) as count,
                  COUNT(*) FILTER (WHERE owner_wallet IS NOT NULL AND owner_wallet != \'\') as valid_count,
                  owner_name as discord_username
                FROM nft_metadata
                WHERE owner_wallet NOT IN ($1, $2)
                AND owner_wallet IS NOT NULL
                AND owner_wallet != \'\'
                GROUP BY owner_wallet, symbol, owner_name
                HAVING COUNT(*) > 0
              `;
            queryParams = [PROJECT_WALLET, ME_ESCROW];
        }

        console.log('Executing query:', {
          query,
          params: queryParams
        });

        const nftResult = await client.query(query, queryParams);

        console.log('[DEBUG] Raw NFT query result rows:', nftResult.rows);

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

               // Use the dbSymbol for floor price lookup
               const floorPrice = floorPrices[dbSymbol] || 0;

               totals[wallet_address] = {
                   nfts: numericCount,
                   value: numericCount * floorPrice,
                   discord_username: discord_username || null,
                   symbol: dbSymbol.toLowerCase() // Add symbol for dropdown
               };
               console.log('[DEBUG] Processed holder (single collection):', { wallet: wallet_address, count: numericCount, floorPrice, value: totals[wallet_address].value });

          } else { // Original logic for 'all' collections
              const { owner_wallet, symbol, valid_count, discord_username } = row;
              
              if (!owner_wallet || !symbol || valid_count === undefined) {
                console.warn('Skipping invalid row:', row);
                continue;
              }

               // Debug log to check symbol and floor price lookup
              console.log(`[DEBUG] Processing NFT for value calculation (all collections): Wallet=${owner_wallet}, Symbol=${symbol}, Count=${valid_count}, FloorPriceLookup=${floorPrices[symbol]}, ActualFloorPricesObject=`, floorPrices);

              // Normalize the symbol to match our COLLECTION_SLUGS keys
              const normalizedSymbol = symbol?.toUpperCase();
              const slug = COLLECTION_SLUGS[normalizedSymbol];
              if (!slug) {
                console.warn(`No Magic Eden slug mapping found for symbol: ${symbol} (normalized: ${normalizedSymbol})`);
                continue;
              }

              const floorPrice = floorPrices[slug] || 0;
              if (process.env.NODE_ENV === 'development') {
                if (!(slug in floorPrices)) {
                  console.warn(`No floor price found for slug: ${slug} (original: ${symbol}, normalized: ${normalizedSymbol})`);
                }
              }
              totals[owner_wallet] = {
                nfts: 0,
                value: 0,
                discord_username: discord_username || null,
                symbol: symbol?.toLowerCase()  // Use the original database symbol for dropdown
              };

              const count = Number(valid_count);
              console.log('[DEBUG] Processing row (all collections):', { 
                wallet: owner_wallet, 
                count: count, 
                originalSymbol: symbol,
                normalizedSymbol,
                slug,
                floorPrice,
                row 
              });
              if (isNaN(count)) {
                console.warn('Invalid count value:', valid_count);
                continue;
              }

              totals[owner_wallet].nfts += count;
              totals[owner_wallet].value += count * floorPrice;

              console.log('Processing holder (all collections):', {
                wallet: owner_wallet,
                symbol,
                slug,
                count,
                floorPrice,
                totalNFTs: totals[owner_wallet].nfts,
                totalValue: totals[owner_wallet].value,
                discordUsername: totals[owner_wallet].discord_username
              });
          }
        }

        console.log('[DEBUG] Finished calculating totals. Totals object keys count:', Object.keys(totals).length);

        if (Object.keys(totals).length === 0) {
          console.warn('No valid holders found');
          return res.status(200).json({ holders: [] });
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
          return res.status(200).json({ holders: [] });
        }

        res.setHeader('Cache-Control', 'public, s-maxage=60');
        return res.status(200).json({ holders });
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

      // Format BUX holders
      const holders = result.rows.map(holder => {
        const holderBalance = Number(holder.amount);
        const valueInSol = holderBalance * tokenValueInSol;
        const valueInUsd = solPrice !== null && !isNaN(solPrice) ? valueInSol * solPrice : NaN;

        return {
          address: holder.discord_name || holder.address.slice(0, 4) + '...' + holder.address.slice(-4),
          amount: holderBalance.toLocaleString(),
          percentage: holder.percentage + '%',
          value: `${valueInSol.toFixed(2)} SOL ($${!isNaN(valueInUsd) ? valueInUsd.toFixed(2) : 'NaN'})`
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
