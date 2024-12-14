import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());

app.get('/api/collections/:symbol/stats', async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(
      `https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 