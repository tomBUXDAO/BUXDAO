import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

// Use the complete webhook URL
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1341528749505773610/4WdYTZGwj0IlHuCag4IWTuoWsDo3J38_AROIYezsPsjmUSixydk-lGX52fj6ar12koPc';

router.post('/send', async (req, res) => {
  try {
    const { content, embeds } = req.body;

    // Send message via webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content || '',
        embeds: embeds || []
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Discord API error: ${JSON.stringify(error)}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 