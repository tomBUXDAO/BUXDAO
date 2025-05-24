import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');

  try {
    const client = await pool.connect();

    // Listen for rewards_processed notifications
    await client.query('LISTEN rewards_processed');

    // Handle notifications
    client.on('notification', (msg) => {
      if (msg.channel === 'rewards_processed') {
        const data = JSON.parse(msg.payload);
        res.write(`data: ${JSON.stringify({
          type: 'rewards_processed',
          ...data
        })}\n\n`);
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      client.query('UNLISTEN rewards_processed')
        .then(() => client.release())
        .catch(console.error);
    });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    res.end();
  }
});

export default router; 