import { Pool } from 'pg';

export default async function handler(req, res) {
  const { symbol } = req.query;
  
  try {
    const response = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(`Error fetching stats for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
} 