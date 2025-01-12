import axios from 'axios';

const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get product ID from the URL
  const productId = req.query.id;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    // Fetch product details from Printful
    const response = await axios.get(`${PRINTFUL_API_URL}/store/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`
      }
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Return the product details
    res.status(200).json(response.data.result);
  } catch (error) {
    console.error('Printful API error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch product details',
      details: error.response?.data || error.message
    });
  }
} 