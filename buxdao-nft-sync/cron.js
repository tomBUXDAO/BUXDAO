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

// Function to run the sync script
function runSync() {
  console.log(`\n[${new Date().toISOString()}] Running NFT sync...`);
  
  const syncProcess = spawn('node', ['sync-celebcatz.js'], {
    stdio: 'inherit',
    env: process.env
  });

  syncProcess.on('error', (error) => {
    console.error(`Error running sync: ${error.message}`);
  });

  syncProcess.on('close', (code) => {
    console.log(`Sync process exited with code ${code}`);
  });
}

// Run immediately on startup
console.log('Running initial sync...');
runSync();

// Schedule to run every 15 minutes
console.log('Setting up cron schedule...');
cron.schedule('*/15 * * * *', () => {
  console.log(`\n[${new Date().toISOString()}] Cron triggered - running sync...`);
  runSync();
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