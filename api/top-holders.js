import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'bux';
    const collection = url.searchParams.get('collection') || 'all';

    const PROJECT_WALLET = 'CatzBPyMJcQgnAZ9hCtSNzDTrLLsRxerJYwh5LMe87kY';
    const ME_ESCROW = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';

    // Get SOL price
    let solPrice = 195; // Default price
    try {
      const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (solPriceResponse.ok) {
        const solPriceData = await solPriceResponse.json();
        solPrice = Number(solPriceData.solana?.usd || 195);
      }
    } catch (error) {
      console.error('Error fetching SOL price:', error);
    }

    if (type === 'bux,nfts') {
      // Get BUX balances
      const buxResult = await sql`
        SELECT 
          wallet_address,
          owner_name as discord_name,
          balance,
          is_exempt
        FROM bux_holders 
        WHERE is_exempt = FALSE
      `;
      
      // Get all NFT holdings
      const nftResult = await sql`
        SELECT owner_wallet, symbol, COUNT(*) as count
        FROM nft_metadata 
        WHERE owner_wallet NOT IN (${PROJECT_WALLET}, ${ME_ESCROW})
        AND owner_wallet IS NOT NULL 
        AND owner_wallet != ''
        GROUP BY owner_wallet, symbol
      `;

      // Default floor prices
      const floorPrices = {
        'FCKEDCATZ': 0.045,
        'MM': 0.069,
        'AIBB': 0.35,
        'MM3D': 0.04,
        'CelebCatz': 0.489
      };

      // Combine holdings
      const combinedHoldings = {};
      
      // Add BUX holdings
      for (const holder of buxResult.rows) {
        const wallet = holder.wallet_address;
        if (!combinedHoldings[wallet]) {
          combinedHoldings[wallet] = {
            address: holder.discord_name || wallet.slice(0, 4) + '...' + wallet.slice(-4),
            buxBalance: Number(holder.balance),
            nftCount: 0,
            buxValue: 0,
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
        combinedHoldings[wallet].nftValue += Number(nft.count) * (floorPrices[nft.symbol] || 0);
      }

      // Format and sort combined holdings
      const holders = Object.values(combinedHoldings)
        .map(holder => ({
          address: holder.address,
          bux: holder.buxBalance.toLocaleString(),
          nfts: `${holder.nftCount} NFTs`,
          value: `${(holder.buxValue + holder.nftValue).toFixed(2)} SOL ($${((holder.buxValue + holder.nftValue) * solPrice).toFixed(2)})`
        }))
        .sort((a, b) => {
          const valueA = parseFloat(a.value.split(' ')[0]);
          const valueB = parseFloat(b.value.split(' ')[0]);
          return valueB - valueA;
        })
        .slice(0, 5);

      return new Response(JSON.stringify({ holders }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60'
        }
      });
    }

    if (type === 'nfts') {
      // Map frontend names to DB symbols
      const dbSymbols = {
        'fckedcatz': 'FCKEDCATZ',
        'moneymonsters': 'MM',
        'aibitbots': 'AIBB',
        'moneymonsters3d': 'MM3D',
        'celebcatz': 'CelebCatz'
      };

      // Default floor prices
      const floorPrices = {
        'FCKEDCATZ': 0.045,
        'MM': 0.069,
        'AIBB': 0.35,
        'MM3D': 0.04,
        'CelebCatz': 0.489
      };

      // Get NFT counts
      const dbSymbol = collection !== 'all' ? dbSymbols[collection] : null;
      const nftResult = dbSymbol 
        ? await sql`
            SELECT owner_wallet, symbol, COUNT(*) as count
            FROM nft_metadata 
            WHERE owner_wallet NOT IN (${PROJECT_WALLET}, ${ME_ESCROW})
            AND owner_wallet IS NOT NULL 
            AND owner_wallet != ''
            AND symbol = ${dbSymbol}
            GROUP BY owner_wallet, symbol
          `
        : await sql`
            SELECT owner_wallet, symbol, COUNT(*) as count
            FROM nft_metadata 
            WHERE owner_wallet NOT IN (${PROJECT_WALLET}, ${ME_ESCROW})
            AND owner_wallet IS NOT NULL 
            AND owner_wallet != ''
            GROUP BY owner_wallet, symbol
          `;

      // Calculate totals
      const totals = {};
      for (const row of nftResult.rows) {
        const { owner_wallet, symbol, count } = row;
        if (!totals[owner_wallet]) {
          totals[owner_wallet] = { nfts: 0, value: 0 };
        }
        totals[owner_wallet].nfts += Number(count);
        totals[owner_wallet].value += Number(count) * (floorPrices[symbol] || 0);
      }

      // Format response
      const holders = Object.entries(totals)
        .map(([wallet, data]) => ({
          address: wallet.slice(0, 4) + '...' + wallet.slice(-4),
          amount: `${data.nfts} NFTs`,
          value: `${data.value.toFixed(2)} SOL ($${(data.value * solPrice).toFixed(2)})`
        }))
        .sort((a, b) => {
          const valueA = parseFloat(a.value.split(' ')[0]);
          const valueB = parseFloat(b.value.split(' ')[0]);
          return valueB - valueA;
        })
        .slice(0, 5);

      return new Response(JSON.stringify({ holders }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60'
        }
      });
    }

    if (type === 'bux') {
      // Get BUX holders
      const result = await sql`
        SELECT 
          wallet_address as address,
          owner_name as discord_name,
          balance as amount,
          is_exempt,
          ROUND((balance * 100.0 / (
            SELECT SUM(balance) FROM bux_holders WHERE is_exempt = FALSE
          )), 2) as percentage
        FROM bux_holders 
        WHERE is_exempt = FALSE
        ORDER BY balance DESC 
        LIMIT 5
      `;

      // Format BUX holders
      const holders = result.rows.map(holder => ({
        address: holder.discord_name || holder.address.slice(0, 4) + '...' + holder.address.slice(-4),
        amount: Number(holder.amount).toLocaleString(),
        percentage: holder.percentage + '%',
        value: `${(Number(holder.amount) * 0.069).toFixed(2)} SOL ($${(Number(holder.amount) * 0.069 * solPrice).toFixed(2)})`
      }));

      return new Response(JSON.stringify({ holders }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60'
        }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid type parameter' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('Error in top holders endpoint:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
