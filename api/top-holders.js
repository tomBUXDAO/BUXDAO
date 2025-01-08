import pkg from 'pg';
const { Pool } = pkg;
import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let client;
  try {
    const type = req.query.type || 'bux';
    const collection = req.query.collection || 'all';

    const PROJECT_WALLET = 'CatzBPyMJcQgnAZ9hCtSNzDTrLLsRxerJYwh5LMe87kY';
    const ME_ESCROW = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';

    // Create database client
    const pool = new Pool({
      connectionString: process.env.POSTGRES_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    client = await pool.connect();

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

      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).json({ holders });
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
        ? await client.query(`
            SELECT owner_wallet, symbol, COUNT(*) as count
            FROM nft_metadata 
            WHERE owner_wallet NOT IN ($1, $2)
            AND owner_wallet IS NOT NULL 
            AND owner_wallet != ''
            AND symbol = $3
            GROUP BY owner_wallet, symbol
          `, [PROJECT_WALLET, ME_ESCROW, dbSymbol])
        : await client.query(`
            SELECT owner_wallet, symbol, COUNT(*) as count
            FROM nft_metadata 
            WHERE owner_wallet NOT IN ($1, $2)
            AND owner_wallet IS NOT NULL 
            AND owner_wallet != ''
            GROUP BY owner_wallet, symbol
          `, [PROJECT_WALLET, ME_ESCROW]);

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

      res.setHeader('Cache-Control', 'public, s-maxage=60');
      return res.status(200).json({ holders });
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
        LIMIT 5
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
        const valueInUsd = valueInSol * solPrice;
        
        return {
          address: holder.discord_name || holder.address.slice(0, 4) + '...' + holder.address.slice(-4),
          amount: holderBalance.toLocaleString(),
          percentage: holder.percentage + '%',
          value: `${valueInSol.toFixed(2)} SOL ($${valueInUsd.toFixed(2)})`
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
