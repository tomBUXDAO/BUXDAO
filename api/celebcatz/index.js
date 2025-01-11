import client from '../../config/database.js';

// Test data for development
const TEST_IMAGES = Array.from({ length: 10 }, (_, i) => ({
  image_url: `https://buxdao.com/celebcatz/${i + 1}.jpg`,
  name: `Celebrity Catz #${i + 1}`
}));

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com'
    : 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Content-Type', 'application/json');
  // Disable caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).json({});
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the URL to get the endpoint
    const url = new URL(req.url, 'http://localhost');
    const endpoint = url.searchParams.get('endpoint');
    console.log('[CelebCatz] Endpoint:', endpoint, 'URL:', req.url);

    if (endpoint === 'images') {
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
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('[CelebCatz] Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
} 