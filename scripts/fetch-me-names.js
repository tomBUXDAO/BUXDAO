import { pool } from '../api/config/database.js';
import fetch from 'node-fetch';

const MAGIC_EDEN_API = 'https://api-mainnet.magiceden.dev/v2';
const COLLECTION_SYMBOL = 'ai_energy_apes';

// Rate limiting helper - 10 requests per second
const rateLimit = () => new Promise(resolve => setTimeout(resolve, 100));

async function fetchMENames() {
  console.log('Initializing Magic Eden name fetch...');
  const client = await pool.connect();

  try {
    // Get all unnamed NFTs
    const { rows: nfts } = await client.query(`
      SELECT mint_address
      FROM nft_metadata 
      WHERE (name IS NULL OR name = '')
      ORDER BY mint_address
    `);

    console.log(`Found ${nfts.length} unnamed NFTs`);
    
    // Track results
    const processed = [];
    const failed = [];

    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];
      console.log(`\nProcessing ${i + 1}/${nfts.length} (${((i + 1) / nfts.length * 100).toFixed(1)}%)`);
      console.log(`Mint: ${nft.mint_address}`);

      try {
        await rateLimit();
        const response = await fetch(`${MAGIC_EDEN_API}/tokens/${nft.mint_address}`);
        if (!response.ok) {
          throw new Error(`Magic Eden API error: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data?.name) {
          throw new Error('No name returned from Magic Eden');
        }

        // Update database with name
        await client.query(`
          UPDATE nft_metadata 
          SET name = $1
          WHERE mint_address = $2`,
          [data.name, nft.mint_address]
        );

        processed.push({
          mint: nft.mint_address,
          name: data.name
        });

        console.log(`✓ Updated name to: ${data.name}`);

      } catch (error) {
        console.error(`❌ Error processing ${nft.mint_address}:`, error.message);
        failed.push({
          mint: nft.mint_address,
          error: error.message
        });
      }

      // Log progress every 10 NFTs
      if ((i + 1) % 10 === 0 || i === nfts.length - 1) {
        console.log('\nProgress Summary:');
        console.log(`✓ Processed: ${processed.length}`);
        console.log(`❌ Failed: ${failed.length}`);
      }
    }

    // Final logging
    console.log('\n=== Final Results ===');
    console.log(`✓ Successfully processed: ${processed.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    
    console.log('\nProcessed NFTs:');
    processed.forEach(nft => {
      console.log(`${nft.mint}: ${nft.name}`);
    });

    if (failed.length > 0) {
      console.log('\nFailed NFTs:');
      failed.forEach(nft => {
        console.log(`${nft.mint}: ${nft.error}`);
      });
    }

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
fetchMENames()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 