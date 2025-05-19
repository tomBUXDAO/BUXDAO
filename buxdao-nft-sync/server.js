import express from 'express';
import cron from 'node-cron';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { pool } from './db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: `${__dirname}/.env` });

const app = express();
const PORT = process.env.PORT || 3001;

// List of all sync scripts to run sequentially
const syncScripts = [
  'ensure-claim-accounts.js',
  'sync-celebcatz.js',
  'sync-fckedcatz.js',
  'sync-monsters.js',
  'sync-mm3d.js',
  'sync-aibitbots.js',
  'sync-aelxaibb.js',
  'sync-airb.js',
  'sync-ausqrl.js',
  'sync-ddbot.js',
  'sync-clb.js',
  'sync-roles.js'
];

// Function to run a single script and return a Promise
function runScript(script) {
  return new Promise((resolve, reject) => {
    console.log(`\n[${new Date().toISOString()}] Running ${script}...`);
    const syncProcess = spawn('node', [script], {
      stdio: 'inherit',
      env: process.env
    });
    syncProcess.on('error', (error) => {
      console.error(`Error running ${script}: ${error.message}`);
      reject(error);
    });
    syncProcess.on('close', (code) => {
      console.log(`${script} exited with code ${code}`);
      resolve();
    });
  });
}

// Function to run all scripts sequentially
async function runAllSyncs() {
  for (const script of syncScripts) {
    try {
      await runScript(script);
    } catch (err) {
      console.error(`Error in ${script}:`, err);
    }
  }
  console.log(`\n[${new Date().toISOString()}] All sync scripts completed.`);
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      lastSync: global.lastSyncTime || 'never'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Run immediately on startup
console.log('Running initial sync...');
runAllSyncs().then(() => {
  global.lastSyncTime = new Date().toISOString();
});

// Schedule to run every 15 minutes
console.log('Setting up cron schedule...');
cron.schedule('*/15 * * * *', () => {
  console.log(`\n[${new Date().toISOString()}] Cron triggered - running all sync scripts...`);
  runAllSyncs().then(() => {
    global.lastSyncTime = new Date().toISOString();
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('NFT sync scheduled to run every 15 minutes');
  console.log('Next sync will run at:', new Date(Date.now() + 15 * 60 * 1000).toISOString());
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Cleaning up...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Cleaning up...');
  process.exit(0);
}); 