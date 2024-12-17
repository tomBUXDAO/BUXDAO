export default async function handler(req, res) {
  const { symbol } = req.query;

  try {
    const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}`);
    const data = await response.json();
    
    res.status(200).json({ image: data.image });
  } catch (error) {
    console.error('Error fetching collection image:', error);
    res.status(500).json({ error: 'Failed to fetch collection image' });
  }
} 