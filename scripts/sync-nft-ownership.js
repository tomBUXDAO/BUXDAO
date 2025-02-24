import { Connection, PublicKey } from '@solana/web3.js';
import { pool } from '../api/config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Marketplace escrow wallets
const MARKETPLACE_ESCROWS = {
  MAGICEDEN: {
    id: '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix',
    name: 'Magic Eden'
  },
  TENSOR: {
    id: '4zdNGgAtFsW1cQgHqkiWyRsxaAgxrSRRynnuunxzjxue',
    name: 'Tensor'
  }
};

// Create sets for easier lookup
const ESCROW_WALLETS = new Set(Object.values(MARKETPLACE_ESCROWS).map(m => m.id));

// Get marketplace name from escrow address
function getMarketplaceName(address) {
  return Object.values(MARKETPLACE_ESCROWS).find(m => m.id === address)?.name || 'Unknown';
}

// Rate limiting helper
async function rateLimit() {
  await new Promise(resolve => setTimeout(resolve, 100)); // 10 requests per second max
}

async function logToFile(category, data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = path.join(process.cwd(), 'logs');
  
  // Ensure logs directory exists
  await fs.mkdir(logDir, { recursive: true });
  
  const logFile = path.join(logDir, `${category}-${timestamp}.json`);
  await fs.writeFile(logFile, JSON.stringify(data, null, 2));
  console.log(`Logged ${category} to ${logFile}`);
}

async function syncNFTOwnership() {
  const connection = new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed');
  const client = await pool.connect();
  
  try {
    console.log('\nFetching NFTs from database...');
    // Get all NFTs from database
    const { rows: nfts } = await client.query(`
      SELECT 
        mint_address, 
        name,
        symbol,
        owner_wallet,
        original_lister,
        is_listed,
        marketplace,
        list_price
      FROM nft_metadata
      ORDER BY symbol, name
    `);

    console.log(`\nFound ${nfts.length} NFTs to check`);
    console.log('Grouped by collection:');
    const bySymbol = nfts.reduce((acc, nft) => {
      acc[nft.symbol] = (acc[nft.symbol] || 0) + 1;
      return acc;
    }, {});
    Object.entries(bySymbol).forEach(([symbol, count]) => {
      console.log(`${symbol}: ${count} NFTs`);
    });

    // Tracking arrays for different scenarios
    const toUpdateOriginalLister = [];
    const potentialSales = [];
    const newListings = [];
    const edgeCases = [];
    const processed = [];

    console.log('\nStarting NFT processing...\n');
    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];
      console.log(`\nProcessing NFT ${i + 1}/${nfts.length} (${((i + 1) / nfts.length * 100).toFixed(1)}%)`);
      console.log(`Name: ${nft.name}`);
      console.log(`Mint: ${nft.mint_address}`);
      console.log(`Current Owner: ${nft.owner_wallet}`);
      console.log(`Listed: ${nft.is_listed ? 'Yes' : 'No'}${nft.marketplace ? ` on ${nft.marketplace}` : ''}`);

      try {
        await rateLimit();
        
        console.log('Looking up token accounts...');
        // Get current token account
        const mint = new PublicKey(nft.mint_address);
        const tokenAccounts = await connection.getTokenLargestAccounts(mint);
        
        // Check if we got any token accounts
        if (!tokenAccounts?.value?.length) {
          console.log('❌ No token accounts found');
          edgeCases.push({ 
            ...nft, 
            reason: 'No token accounts found',
            details: tokenAccounts 
          });
          continue;
        }
        
        await rateLimit();
        
        const tokenAccount = tokenAccounts.value[0];
        console.log(`Found token account: ${tokenAccount.address.toString()}`);

        // Get current owner
        console.log('Fetching account info...');
        const accountInfo = await connection.getAccountInfo(tokenAccount.address);
        if (!accountInfo || accountInfo.data.length === 0) {
          console.log('❌ Invalid token account data');
          edgeCases.push({ 
            ...nft, 
            reason: 'Invalid token account',
            tokenAccount: tokenAccount.address.toString()
          });
          continue;
        }

        // Parse token account data
        const tokenData = parseTokenAccountData(accountInfo.data);
        const currentOwner = tokenData?.owner;
        if (!currentOwner) {
          console.log('❌ Could not parse owner from token data');
          edgeCases.push({ ...nft, reason: 'Could not parse owner' });
          continue;
        }
        console.log(`Current owner from chain: ${currentOwner}`);

        const isCurrentlyListed = ESCROW_WALLETS.has(currentOwner);
        const wasListed = nft.is_listed;
        
        // Case 1: Not listed and same owner - skip
        if (!isCurrentlyListed && currentOwner === nft.owner_wallet) {
          console.log('✓ NFT status unchanged (same owner, not listed)');
          processed.push(nft.mint_address);
          continue;
        }

        // Case 2: Listed in DB and still listed - add original_lister if missing
        if (wasListed && isCurrentlyListed && !nft.original_lister) {
          console.log('⚠️ Listed NFT missing original_lister, adding to update list');
          toUpdateOriginalLister.push({
            mint: nft.mint_address,
            owner: nft.owner_wallet,
            escrow: currentOwner
          });
        }

        // Case 3: Listed in DB but not actually listed
        if (wasListed && !isCurrentlyListed) {
          console.log('🔄 NFT was listed but now owned by a non-escrow wallet - potential sale');
          potentialSales.push({
            mint: nft.mint_address,
            previousOwner: nft.owner_wallet,
            currentOwner,
            previousMarketplace: nft.marketplace,
            previousListPrice: nft.list_price
          });

          console.log('Updating database to reflect new ownership...');
          // Update database
          await client.query(`
            UPDATE nft_metadata 
            SET owner_wallet = $1,
                is_listed = false,
                marketplace = NULL,
                list_price = NULL
            WHERE mint_address = $2`,
            [currentOwner, nft.mint_address]
          );
          console.log('✓ Database updated');
        }

        // Case 4: Not listed in DB but actually listed
        if (!wasListed && isCurrentlyListed) {
          console.log('📝 NFT is listed but not marked as listed in database');
          newListings.push({
            mint: nft.mint_address,
            originalOwner: nft.owner_wallet,
            escrowWallet: currentOwner,
            marketplace: getMarketplaceName(currentOwner)
          });

          console.log('Updating database with listing info...');
          // Update database
          await client.query(`
            UPDATE nft_metadata 
            SET owner_wallet = $1,
                original_lister = $2,
                is_listed = true,
                marketplace = $3
            WHERE mint_address = $4`,
            [currentOwner, nft.owner_wallet, getMarketplaceName(currentOwner), nft.mint_address]
          );
          console.log('✓ Database updated');
        }

        processed.push(nft.mint_address);
        console.log('✓ NFT processed successfully');

      } catch (error) {
        console.error(`❌ Error processing NFT ${nft.mint_address}:`, error);
        edgeCases.push({ 
          ...nft, 
          reason: 'Processing error', 
          error: error.message 
        });
      }
    }

    // Log final results
    console.log('\n=== Final Results ===');
    console.log(`✓ Successfully processed: ${processed.length}`);
    console.log(`⚠️ Need original_lister: ${toUpdateOriginalLister.length}`);
    console.log(`🔄 Potential sales: ${potentialSales.length}`);
    console.log(`📝 New listings: ${newListings.length}`);
    console.log(`❌ Edge cases: ${edgeCases.length}`);

    // Add more detailed logging for each category
    if (toUpdateOriginalLister.length > 0) {
      console.log('\nNFTs needing original_lister update:');
      toUpdateOriginalLister.forEach(item => {
        console.log(`${item.mint}: ${item.owner} -> ${item.escrow}`);
      });
    }

    if (potentialSales.length > 0) {
      console.log('\nPotential sales to check:');
      potentialSales.forEach(item => {
        console.log(`${item.mint}: ${item.previousOwner} -> ${item.currentOwner} (was listed on ${item.previousMarketplace})`);
      });
    }

    // Write detailed logs
    await logToFile('original-lister-updates', toUpdateOriginalLister);
    await logToFile('potential-sales', potentialSales);
    await logToFile('new-listings', newListings);
    await logToFile('edge-cases', edgeCases);

  } catch (error) {
    console.error('Error in syncNFTOwnership:', error);
    throw error;
  } finally {
    client.release();
  }
}

function parseTokenAccountData(data) {
  try {
    const dataLayout = {
      mint: { offset: 0, length: 32 },
      owner: { offset: 32, length: 32 },
      amount: { offset: 64, length: 8 }
    };

    const ownerBytes = data.slice(
      dataLayout.owner.offset, 
      dataLayout.owner.offset + dataLayout.owner.length
    );
    
    return {
      owner: new PublicKey(ownerBytes).toBase58()
    };
  } catch (error) {
    console.error('Error parsing token account data:', error);
    return null;
  }
}

// Run the sync if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncNFTOwnership()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default syncNFTOwnership; 