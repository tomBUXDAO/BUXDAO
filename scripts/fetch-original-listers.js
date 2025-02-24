import { Connection, PublicKey } from '@solana/web3.js';
import { pool } from '../api/config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Constants
const MAGIC_EDEN_API = 'https://api-mainnet.magiceden.dev/v2';
const TENSOR_API = 'https://api.tensor.so/graphql';
const ME_ESCROW = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';
const TENSOR_ESCROW = '4zdNGgAtFsW1cQgHqkiWyRsxaAgxrSRRynnuunxzjxue';

// Rate limiting helper - 10 requests per second
const rateLimit = () => new Promise(resolve => setTimeout(resolve, 100));

// Logging helper
async function logToFile(category, data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = path.join(process.cwd(), 'logs', 'original-listers');
  
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `${category}-${timestamp}.json`);
  await fs.writeFile(logFile, JSON.stringify(data, null, 2));
  console.log(`Logged ${category} to ${logFile}`);
}

// Fetch listing info from Magic Eden
async function getMagicEdenListing(mintAddress) {
  try {
    await rateLimit();
    const response = await fetch(`${MAGIC_EDEN_API}/tokens/${mintAddress}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data?.owner || null;
  } catch (error) {
    console.error(`Error fetching ME listing for ${mintAddress}:`, error);
    return null;
  }
}

// Fetch listing info from Tensor
async function getTensorListing(mintAddress) {
  try {
    await rateLimit();
    const query = {
      query: `
        query GetListing($mint: String!) {
          nft(mint: $mint) {
            owner
            lastSale {
              seller
            }
          }
        }
      `,
      variables: { mint: mintAddress }
    };

    const response = await fetch(TENSOR_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data?.data?.nft?.owner || data?.data?.nft?.lastSale?.seller || null;
  } catch (error) {
    console.error(`Error fetching Tensor listing for ${mintAddress}:`, error);
    return null;
  }
}

async function fetchOriginalListers() {
  console.log('Initializing original listers fetch...');
  const connection = new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed');
  const client = await pool.connect();

  try {
    // Get all NFTs missing original_lister
    const { rows: nfts } = await client.query(`
      SELECT 
        name,
        mint_address,
        owner_wallet,
        marketplace,
        list_price
      FROM nft_metadata 
      WHERE is_listed = true 
      AND original_lister IS NULL
      ORDER BY name
    `);

    console.log(`Found ${nfts.length} NFTs missing original_lister`);
    
    // Group by collection for logging
    const collections = nfts.reduce((acc, nft) => {
      const collection = nft.name?.split('#')[0]?.trim() || 'Unknown';
      acc[collection] = (acc[collection] || 0) + 1;
      return acc;
    }, {});

    console.log('\nNFTs by collection:');
    Object.entries(collections).forEach(([collection, count]) => {
      console.log(`${collection}: ${count}`);
    });

    // Track results
    const processed = [];
    const failed = [];
    const skipped = [];

    console.log('\nStarting NFT processing...');
    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];
      console.log(`\nProcessing ${i + 1}/${nfts.length} (${((i + 1) / nfts.length * 100).toFixed(1)}%)`);
      console.log(`Name: ${nft.name}`);
      console.log(`Mint: ${nft.mint_address}`);
      console.log(`Marketplace: ${nft.marketplace}`);

      try {
        let originalOwner = null;

        // Try to get owner from appropriate marketplace
        if (nft.owner_wallet === ME_ESCROW || nft.marketplace?.toLowerCase() === 'magic eden') {
          console.log('Fetching from Magic Eden...');
          originalOwner = await getMagicEdenListing(nft.mint_address);
        } else if (nft.owner_wallet === TENSOR_ESCROW || nft.marketplace?.toLowerCase() === 'tensor') {
          console.log('Fetching from Tensor...');
          originalOwner = await getTensorListing(nft.mint_address);
        }

        if (!originalOwner) {
          console.log('❌ Could not determine original owner');
          failed.push({ ...nft, reason: 'Could not determine original owner' });
          continue;
        }

        // Skip if the "original owner" is an escrow wallet
        if (originalOwner === ME_ESCROW || originalOwner === TENSOR_ESCROW) {
          console.log('⚠️ Skipping - owner is an escrow wallet');
          skipped.push({ ...nft, reason: 'Owner is escrow wallet' });
          continue;
        }

        // Update database with original lister
        await client.query(`
          UPDATE nft_metadata 
          SET original_lister = $1
          WHERE mint_address = $2`,
          [originalOwner, nft.mint_address]
        );

        processed.push({
          mint: nft.mint_address,
          name: nft.name,
          original_lister: originalOwner
        });

        console.log(`✓ Updated original_lister to ${originalOwner}`);

      } catch (error) {
        console.error(`❌ Error processing ${nft.mint_address}:`, error);
        failed.push({
          ...nft,
          reason: 'Processing error',
          error: error.message
        });
      }

      // Log progress every 20 NFTs
      if ((i + 1) % 20 === 0 || i === nfts.length - 1) {
        await logToFile('processed', processed);
        await logToFile('failed', failed);
        await logToFile('skipped', skipped);
        
        console.log('\nProgress Summary:');
        console.log(`✓ Processed: ${processed.length}`);
        console.log(`❌ Failed: ${failed.length}`);
        console.log(`⚠️ Skipped: ${skipped.length}`);
      }
    }

    // Final logging
    console.log('\n=== Final Results ===');
    console.log(`✓ Successfully processed: ${processed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⚠️ Skipped: ${skipped.length}`);

    // Write final logs
    await logToFile('final-processed', processed);
    await logToFile('final-failed', failed);
    await logToFile('final-skipped', skipped);

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fetchOriginalListers()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default fetchOriginalListers; 