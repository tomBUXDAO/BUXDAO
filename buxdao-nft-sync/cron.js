import cron from 'node-cron';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: `${__dirname}/.env` });

console.log('Starting NFT sync scheduler...');

// List of all sync scripts to run sequentially
const syncScripts = [
  'ensure-claim-accounts.js',
  'sync-holders.js',
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

// Run immediately on startup
console.log('Running initial sync...');
runAllSyncs();

// Schedule to run every 15 minutes
console.log('Setting up cron schedule...');
cron.schedule('*/15 * * * *', () => {
  console.log(`\n[${new Date().toISOString()}] Cron triggered - running all sync scripts...`);
  runAllSyncs();
});

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Cleaning up...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Cleaning up...');
  process.exit(0);
});

console.log('NFT sync scheduled to run every 15 minutes');
console.log('Next sync will run at:', new Date(Date.now() + 15 * 60 * 1000).toISOString()); 