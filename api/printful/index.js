import express from 'express';
import axios from 'axios';

const router = express.Router();
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

// Middleware to ensure JSON responses
router.use((req, res, next) => {
  res.type('application/json');
  next();
});

// Get all products
router.get('/products', async (req, res) => {
  if (!PRINTFUL_API_KEY) {
    console.error('[Printful] API key not configured');
    return res.status(500).json({ error: 'Printful API key not configured' });
  }

  try {
    console.log('[Printful] Fetching products...');
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status >= 200 && status < 300
    });

    if (!response.data || !response.data.result) {
      console.error('[Printful] Invalid response format:', response.data);
      return res.status(500).json({ error: 'Invalid response from Printful API' });
    }

    console.log('[Printful] Successfully fetched products');
    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch products',
      details: error.response?.data || error.message
    });
  }
});

// Get product details
router.get('/products/:id', async (req, res) => {
  if (!PRINTFUL_API_KEY) {
    console.error('[Printful] API key not configured');
    return res.status(500).json({ error: 'Printful API key not configured' });
  }

  const productId = req.params.id;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    console.log(`[Printful] Fetching product details for ID: ${productId}`);
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products/${productId}`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status >= 200 && status < 300
    });

    if (!response.data || !response.data.result) {
      console.error('[Printful] Invalid response format:', response.data);
      return res.status(500).json({ error: 'Invalid response from Printful API' });
    }

    console.log('[Printful] Successfully fetched product details');
    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch product details',
      details: error.response?.data || error.message
    });
  }
});

export default router; 