const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58').default;
const fs = require('fs');
const path = require('path');

// Load .env file
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    // Remove quotes if present
    let value = valueParts.join('=').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const treasuryPublicKey = 'FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75';
const privateKeyBase58 = envVars.TREASURY_WALLET_SECRET_KEY;

if (!privateKeyBase58) {
  console.log('❌ TREASURY_WALLET_SECRET_KEY not found in .env file');
  process.exit(1);
}

try {
  // Decode the private key from base58
  const privateKeyBytes = bs58.decode(privateKeyBase58);
  const keypair = Keypair.fromSecretKey(privateKeyBytes);
  
  // Verify it matches the expected public key
  if (keypair.publicKey.toString() !== treasuryPublicKey) {
    console.log('❌ Private key does not match expected public key');
    console.log('Expected:', treasuryPublicKey);
    console.log('Got:', keypair.publicKey.toString());
    process.exit(1);
  }
  
  console.log('✅ Treasury wallet verified successfully');
  
  // Create wallet file
  const walletPath = path.resolve(process.env.HOME, '.config/solana/treasury-wallet.json');
  const walletData = Array.from(keypair.secretKey);
  
  fs.writeFileSync(walletPath, JSON.stringify(walletData));
  console.log('✅ Treasury wallet file created:', walletPath);
  
  // Set up Solana config
  console.log('\n🔧 Setting up Solana config...');
  require('child_process').execSync('solana config set --keypair ~/.config/solana/treasury-wallet.json', { stdio: 'inherit' });
  require('child_process').execSync('solana config set --url https://api.mainnet-beta.solana.com', { stdio: 'inherit' });
  
  console.log('\n✅ Treasury wallet setup complete!');
  console.log('📋 Now you can deploy with:');
  console.log('   cd bux_claim && anchor deploy');
  
} catch (error) {
  console.error('❌ Error setting up treasury wallet:', error.message);
  process.exit(1);
} 