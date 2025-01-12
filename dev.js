import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start Vite dev server
const vite = spawn('npm', ['run', 'dev:vite'], {
  stdio: 'inherit',
  shell: true
});

// Start Express server
const server = spawn('npm', ['run', 'dev:server'], {
  stdio: 'inherit',
  shell: true
});

// Handle process termination
process.on('SIGINT', () => {
  vite.kill();
  server.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  vite.kill();
  server.kill();
  process.exit();
}); 