import express from 'express';
import NFTMonitorService from '../services/nft-monitor.js';

const router = express.Router();
console.log('Creating monitor router...');

// Add debugging middleware
router.use((req, res, next) => {
  console.log('Monitor router middleware:', {
    method: req.method,
    path: req.path,
    url: req.url,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl
  });
  next();
});

// Test endpoint to verify router is working
router.get('/ping', (req, res) => {
  res.json({ message: 'Monitor router is working' });
});

let monitorService = null;

// Add error handling middleware
router.use((err, req, res, next) => {
  console.error('Monitor route error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

router.post('/start', async (req, res, next) => {
  try {
    if (!process.env.QUICKNODE_RPC_URL) {
      return res.status(500).json({ error: 'QuickNode RPC URL not configured' });
    }

    if (monitorService && monitorService.isRunning) {
      return res.status(400).json({ error: 'Monitor service is already running' });
    }

    monitorService = new NFTMonitorService(process.env.QUICKNODE_RPC_URL);
    await monitorService.start();

    res.json({ message: 'NFT monitor service started successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/stop', async (req, res, next) => {
  try {
    if (!monitorService || !monitorService.isRunning) {
      return res.status(400).json({ error: 'Monitor service is not running' });
    }

    await monitorService.stop();
    monitorService = null;

    res.json({ message: 'NFT monitor service stopped successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/status', (req, res) => {
  res.json({
    isRunning: monitorService?.isRunning || false,
    activeSubscriptions: monitorService?.subscriptions.size || 0
  });
});

router.post('/test-webhook', async (req, res, next) => {
  console.log('Received test-webhook request');
  try {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      console.error('Discord webhook URL not configured');
      return res.status(500).json({ error: 'Discord webhook URL not configured' });
    }

    if (!process.env.QUICKNODE_RPC_URL) {
      console.error('QuickNode RPC URL not configured');
      return res.status(500).json({ error: 'QuickNode RPC URL not configured' });
    }

    console.log('QuickNode RPC URL check:', {
      exists: !!process.env.QUICKNODE_RPC_URL,
      value: process.env.QUICKNODE_RPC_URL,
      startsWithHttp: process.env.QUICKNODE_RPC_URL?.startsWith('http')
    });

    console.log('Creating monitor service...');
    if (!monitorService) {
      monitorService = new NFTMonitorService(process.env.QUICKNODE_RPC_URL);
    }

    console.log('Testing webhook...');
    const success = await monitorService.testWebhook();
    if (success) {
      console.log('Webhook test successful');
      res.json({ message: 'Webhook test message sent successfully' });
    } else {
      console.error('Webhook test failed');
      res.status(500).json({ error: 'Failed to send webhook test message' });
    }
  } catch (error) {
    next(error);
  }
});

console.log('Monitor router created successfully');
export default router; 