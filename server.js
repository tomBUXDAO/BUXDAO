import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Stats endpoint
app.get('/api/collections/:symbol/stats', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching stats for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 