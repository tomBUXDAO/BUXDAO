export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`https://api.printful.com/store/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Invalid response format from Printful API');
    }

    // Return the product details
    res.status(200).json(data.result);
  } catch (error) {
    console.error('Error fetching product from Printful:', error);
    res.status(500).json({ error: error.message });
  }
} 