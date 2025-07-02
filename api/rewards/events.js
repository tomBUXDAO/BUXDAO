import { pool } from '../config/database.js';

export default async function handler(req, res) {
  // CORS headers
  const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://buxdao.com' : 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial connection message
  res.write('data: {"type":"connected"}\n\n');

  try {
    const client = await pool.connect();
    await client.query('LISTEN rewards_processed');
    client.on('notification', (msg) => {
      if (msg.channel === 'rewards_processed') {
        const data = JSON.parse(msg.payload);
        res.write(`data: ${JSON.stringify({
          type: 'rewards_processed',
          ...data
        })}\n\n`);
      }
    });
    req.on('close', () => {
      client.query('UNLISTEN rewards_processed')
        .then(() => client.release())
        .catch(console.error);
    });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    res.end();
  }
} 