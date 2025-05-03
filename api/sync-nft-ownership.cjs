const { exec } = require('child_process');
const CRON_SECRET = process.env.CRON_SECRET_TOKEN;

module.exports = async (req, res) => {
  // Only allow GET or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Run the NFT sync script
  exec('node scripts/sync-nft-ownership-wrapper.cjs', { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
      console.error('NFT sync error:', error, stderr);
      return res.status(500).json({ error: 'NFT sync failed', details: stderr });
    }
    return res.status(200).json({ success: true, output: stdout });
  });
}; 