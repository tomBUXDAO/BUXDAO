const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  TOKEN_PROGRAM_ID
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Mainnet configuration
const BUX_TOKEN_MINT = new PublicKey('FMiRxSbLqRTWiBszt1DZmXd7SrscWCccY7fcXNtwWxHK');
const PROGRAM_ID = new PublicKey('AzjaVGh81f1jZtZvouZ4pccaRoPvCcB87Vu2fRDWV5et');

async function setupMainnet() {
  try {
    console.log('🚀 Setting up BUX Claim Program for Mainnet');
    console.log('==========================================');
    
    // Connect to mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    console.log('✅ Connected to mainnet');
    
    // Load wallet
    const walletPath = path.resolve(process.env.HOME, '.config/solana/id.json');
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );
    console.log('✅ Loaded wallet:', walletKeypair.publicKey.toString());
    
    // Check wallet balance
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log('💰 Wallet balance:', balance / 1e9, 'SOL');
    
    if (balance < 0.1 * 1e9) {
      console.log('⚠️  Warning: Low wallet balance. Need at least 0.1 SOL for deployment.');
    }
    
    // Step 1: Deploy the program
    console.log('\n📦 Step 1: Deploying Solana Program...');
    console.log('   This will cost approximately 0.007 SOL');
    
    // Check if program already exists
    const programInfo = await connection.getAccountInfo(PROGRAM_ID);
    if (programInfo) {
      console.log('✅ Program already deployed at:', PROGRAM_ID.toString());
    } else {
      console.log('❌ Program not found. Please deploy using:');
      console.log('   cd bux_claim && anchor deploy');
      console.log('   Then run this script again.');
      return;
    }
    
    // Step 2: Find treasury authority PDA
    console.log('\n🔐 Step 2: Finding Treasury Authority PDA...');
    const [treasuryAuthority, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      PROGRAM_ID
    );
    console.log('✅ Treasury Authority PDA:', treasuryAuthority.toString());
    console.log('✅ Treasury Bump:', treasuryBump);
    
    // Step 3: Get treasury token account
    console.log('\n🏦 Step 3: Setting up Treasury Token Account...');
    
    // Find the treasury token account PDA
    const [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('treasury_token'),
        BUX_TOKEN_MINT.toBuffer(),
        treasuryAuthority.toBuffer()
      ],
      PROGRAM_ID
    );
    
    console.log('✅ Treasury Token Account:', treasuryTokenAccount.toString());
    
    // Check if treasury token account exists
    let treasuryTokenAccountExists = false;
    try {
      await getAccount(connection, treasuryTokenAccount);
      treasuryTokenAccountExists = true;
      console.log('✅ Treasury token account already exists');
    } catch (error) {
      console.log('❌ Treasury token account does not exist');
      console.log('   This needs to be created by the program during first claim');
    }
    
    // Step 4: Verify BUX token mint
    console.log('\n🪙 Step 4: Verifying BUX Token Mint...');
    try {
      const mintInfo = await connection.getAccountInfo(BUX_TOKEN_MINT);
      if (mintInfo) {
        console.log('✅ BUX token mint exists:', BUX_TOKEN_MINT.toString());
      } else {
        console.log('❌ BUX token mint not found');
        return;
      }
    } catch (error) {
      console.log('❌ Error checking BUX token mint:', error.message);
      return;
    }
    
    // Step 5: Update configuration
    console.log('\n⚙️  Step 5: Updating Configuration...');
    
    const config = {
      programId: PROGRAM_ID.toString(),
      buxTokenMint: BUX_TOKEN_MINT.toString(),
      treasuryAuthority: treasuryAuthority.toString(),
      treasuryTokenAccount: treasuryTokenAccount.toString(),
      treasuryBump: treasuryBump
    };
    
    fs.writeFileSync('treasury-config.json', JSON.stringify(config, null, 2));
    console.log('✅ Configuration saved to treasury-config.json');
    
    // Step 6: Summary
    console.log('\n📋 Setup Summary:');
    console.log('==================');
    console.log('Program ID:', config.programId);
    console.log('BUX Token Mint:', config.buxTokenMint);
    console.log('Treasury Authority:', config.treasuryAuthority);
    console.log('Treasury Token Account:', config.treasuryTokenAccount);
    console.log('Treasury Bump:', config.treasuryBump);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Fund the treasury with BUX tokens');
    console.log('2. Test the claim functionality');
    console.log('3. Update frontend configuration');
    
    console.log('\n✅ Mainnet setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

setupMainnet(); 