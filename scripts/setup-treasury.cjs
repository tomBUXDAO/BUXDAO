const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAccount
} = require('@solana/spl-token');
const { Program, AnchorProvider, BN } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Configuration
const PROGRAM_ID = new PublicKey('AzjaVGh81f1jZtZvouZ4pccaRoPvCcB87Vu2fRDWV5et');
const BUX_TOKEN_MINT = new PublicKey('AaKrMsZkuAdJL6TKZbj7X1VaH5qWioL7oDHagQZa1w59');
const RPC_URL = 'https://api.devnet.solana.com'; // Change to mainnet-beta for production

// Load .env file
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const treasuryPublicKey = 'FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75';
const privateKeyBase58 = envVars.TREASURY_WALLET_SECRET_KEY;

if (!privateKeyBase58) {
  console.log('❌ TREASURY_WALLET_SECRET_KEY not found in .env file');
  process.exit(1);
}

try {
  // Decode the private key
  const privateKeyBytes = Buffer.from(privateKeyBase58, 'base64');
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

async function setupTreasury() {
  console.log('🔧 Setting up BUX Claim Treasury...\n');

  // Load wallet keypair
  const walletPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  // Setup connection
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(connection, { publicKey: walletKeypair.publicKey, signTransaction: (tx) => tx.sign(walletKeypair) }, {
    commitment: 'confirmed',
  });

  console.log('📋 Configuration:');
  console.log(`   Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`   BUX Token Mint: ${BUX_TOKEN_MINT.toString()}`);
  console.log(`   Wallet: ${walletKeypair.publicKey.toString()}`);
  console.log(`   Network: ${RPC_URL}\n`);

  try {
    // 1. Find Treasury Authority PDA
    console.log('🔍 Finding Treasury Authority PDA...');
    const [treasuryAuthority, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      PROGRAM_ID
    );
    console.log(`   Treasury Authority: ${treasuryAuthority.toString()}`);
    console.log(`   Treasury Bump: ${treasuryBump}\n`);

    // 2. Create Treasury Token Account
    console.log('🏦 Creating Treasury Token Account...');
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      BUX_TOKEN_MINT,
      treasuryAuthority,
      true // allowOwnerOffCurve
    );
    console.log(`   Treasury Token Account: ${treasuryTokenAccount.toString()}\n`);

    // 3. Check if treasury token account exists
    const treasuryAccountInfo = await connection.getAccountInfo(treasuryTokenAccount);
    if (!treasuryAccountInfo) {
      console.log('⚠️  Treasury token account does not exist. Creating...');
      
      // Create the treasury token account
      const createAtaIx = createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey,
        treasuryTokenAccount,
        treasuryAuthority,
        BUX_TOKEN_MINT
      );

      const createTx = new Transaction().add(createAtaIx);
      const createSignature = await connection.sendTransaction(createTx, [walletKeypair]);
      await connection.confirmTransaction(createSignature, 'confirmed');
      
      console.log(`   ✅ Treasury token account created: ${createSignature}\n`);
    } else {
      console.log('✅ Treasury token account already exists\n');
    }

    // 4. Check treasury balance
    console.log('💰 Checking Treasury Balance...');
    try {
      const treasuryBalance = await connection.getTokenAccountBalance(treasuryTokenAccount);
      console.log(`   Current Balance: ${treasuryBalance.value.uiAmount} BUX\n`);
    } catch (error) {
      console.log('   ⚠️  Could not get treasury balance (account might be empty)\n');
    }

    // 5. Save configuration
    const config = {
      programId: PROGRAM_ID.toString(),
      buxTokenMint: BUX_TOKEN_MINT.toString(),
      treasuryAuthority: treasuryAuthority.toString(),
      treasuryTokenAccount: treasuryTokenAccount.toString(),
      treasuryBump: treasuryBump,
      network: RPC_URL
    };

    fs.writeFileSync('treasury-config.json', JSON.stringify(config, null, 2));
    console.log('💾 Configuration saved to treasury-config.json\n');

    // 6. Display next steps
    console.log('🎯 Next Steps:');
    console.log('   1. Fund the treasury with BUX tokens:');
    console.log(`      Transfer BUX to: ${treasuryTokenAccount.toString()}`);
    console.log('   2. Update frontend configuration:');
    console.log(`      Set treasuryTokenAccount to: ${treasuryTokenAccount.toString()}`);
    console.log('   3. Test the claim functionality\n');

    return config;

  } catch (error) {
    console.error('❌ Error setting up treasury:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupTreasury()
    .then(() => {
      console.log('✅ Treasury setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Treasury setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupTreasury }; 