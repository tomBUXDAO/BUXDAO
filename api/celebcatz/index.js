import express from 'express';
import client from '../../config/database.js';

const router = express.Router();

// Test data for development
const TEST_IMAGES = Array.from({ length: 10 }, (_, i) => ({
  image_url: `https://buxdao.com/celebcatz/${i + 1}.jpg`,
  name: `Celebrity Catz #${i + 1}`
}));

// CelebCatz images endpoint
router.get('/images', async (req, res) => {
  console.log('[CelebCatz] Starting image fetch request');
  
  try {
    // Test database connection first
    try {
      await client.query('SELECT NOW()');
      console.log('[CelebCatz] Database connection test successful');
    } catch (dbError) {
      console.error('[CelebCatz] Database connection test failed:', dbError);
      console.log('[CelebCatz] Returning test data due to database connection failure');
      return res.json({ images: TEST_IMAGES });
    }

    // First check if the table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'nft_metadata'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('[CelebCatz] nft_metadata table does not exist, returning test data');
      return res.json({ images: TEST_IMAGES });
    }

    const query = {
      text: `
        SELECT image_url, name 
        FROM nft_metadata 
        WHERE symbol = 'CelebCatz' 
        AND name LIKE 'Celebrity Catz #%'
        AND image_url IS NOT NULL
        AND image_url != ''
        ORDER BY CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER)
      `
    };
    
    console.log('[CelebCatz] Executing query:', query.text);
    const result = await client.query(query);
    console.log(`[CelebCatz] Query completed. Found ${result.rows.length} images`);
    
    if (result.rows.length === 0) {
      console.log('[CelebCatz] No images found in database, returning test data');
      return res.json({ images: TEST_IMAGES });
    }
    
    // Log a sample of the data
    console.log('[CelebCatz] Sample data:', JSON.stringify(result.rows.slice(0, 2), null, 2));
    
    res.json({ images: result.rows });
  } catch (error) {
    console.error('[CelebCatz] Error in endpoint:', error);
    console.error('[CelebCatz] Error details:', {
      code: error.code,
      message: error.message,
      detail: error.detail,
      schema: error.schema,
      table: error.table,
      constraint: error.constraint,
      stack: error.stack
    });
    
    // Return test data on error
    console.log('[CelebCatz] Returning test data due to error');
    res.json({ images: TEST_IMAGES });
  }
});

export default router; 