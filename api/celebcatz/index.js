import express from 'express';
import { pool as client } from '../config/database.js';

const router = express.Router();

// Test data for development
const TEST_IMAGES = Array.from({ length: 10 }, (_, i) => ({
  image_url: `https://buxdao.com/celebcatz/${i + 1}.jpg`,
  name: `Celebrity Catz #${i + 1}`
}));

// Handle images endpoint
router.get('/images', async (req, res) => {
  console.log('[CelebCatz] Starting image fetch request');
  
  try {
    // Test database connection first
    try {
      await client.query('SELECT NOW()');
      console.log('[CelebCatz] Database connection test successful');
      
      // Fetch images from database
      const result = await client.query(`
        SELECT image_url, name 
        FROM nft_metadata 
        WHERE symbol = 'CelebCatz'
        AND name LIKE 'Celebrity Catz #%'
        AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
        ORDER BY name
      `);
      console.log('[CelebCatz] Successfully fetched images:', result.rows.length);
      
      return res.status(200).json({ images: result.rows });
    } catch (dbError) {
      console.error('[CelebCatz] Database connection test failed:', dbError);
      // Return test data in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('[CelebCatz] Returning test data in development');
        return res.status(200).json({ images: TEST_IMAGES });
      }
      // In production, return empty array instead of failing
      console.log('[CelebCatz] Returning empty array in production');
      return res.status(200).json({ images: [] });
    }
  } catch (error) {
    console.error('[CelebCatz] Error:', error);
    return res.status(500).json({ error: 'Internal server error', images: [] });
  }
});

export default router; 