import { pool } from '../api/config/database.js';

const ME_ESCROW = '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix';
const TENSOR_ESCROW = '4zdNGgAtFsW1cQgHqkiWyRsxaAgxrSRRynnuunxzjxue';

async function checkAndFixEscrowListers() {
  const client = await pool.connect();
  
  try {
    // First check how many NFTs have escrow wallets as original_lister
    const checkQuery = `
      SELECT COUNT(*) as count, original_lister 
      FROM nft_metadata 
      WHERE original_lister IN ($1, $2)
      GROUP BY original_lister
    `;
    
    const { rows: checkResults } = await client.query(checkQuery, [ME_ESCROW, TENSOR_ESCROW]);
    
    if (checkResults.length > 0) {
      console.log('\nFound NFTs with escrow wallets as original_lister:');
      checkResults.forEach(result => {
        console.log(`${result.original_lister}: ${result.count} NFTs`);
      });
      
      // Fix the NFTs by setting original_lister to NULL
      const updateQuery = `
        UPDATE nft_metadata 
        SET original_lister = NULL 
        WHERE original_lister IN ($1, $2)
        RETURNING mint_address, name, original_lister
      `;
      
      const { rows: updatedNFTs } = await client.query(updateQuery, [ME_ESCROW, TENSOR_ESCROW]);
      
      console.log('\nFixed NFTs:');
      updatedNFTs.forEach(nft => {
        console.log(`${nft.name} (${nft.mint_address})`);
      });
      
      console.log(`\nTotal NFTs fixed: ${updatedNFTs.length}`);
    } else {
      console.log('No NFTs found with escrow wallets as original_lister. Everything looks good!');
    }
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
checkAndFixEscrowListers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 