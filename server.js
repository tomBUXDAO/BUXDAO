import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());

// Configure axios with retry logic
const axiosInstance = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    'accept': 'application/json',
    'User-Agent': 'Mozilla/5.0' // Add a proper user agent
  }
});

// Retry logic
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axiosInstance.get(url);
      return response.data;
    } catch (error) {
      if (i === retries - 1) throw error;
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

app.get('/api/collections/:symbol/stats', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await fetchWithRetry(
      `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`
    );
    res.json(data);
  } catch (error) {
    console.error('Error fetching collection stats:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch data',
      message: error.message,
      fallback: {
        floorPrice: 0,
        listedCount: 0,
        volumeAll: 0
      }
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 