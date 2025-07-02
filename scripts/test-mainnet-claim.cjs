const { Connection, Keypair, PublicKey, Transaction } = require('@solana/web3.js');
const { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID
} = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

// Mainnet configuration
const BUX_TOKEN_MINT = new PublicKey('FMiRxSbLqRTWiBszt1DZmXd7SrscWCccY7fcXNtwWxHK');
const PROGRAM_ID = new PublicKey('AzjaVGh81f1jZtZvouZ4pccaRoPvCcB87Vu2fRDWV5et');

async function testMainnetClaim() {
  try {
    console.log('🧪 Testing BUX Claim on Mainnet');
    console.log('================================');
    
    // Connect to mainnet
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    console.log('✅ Connected to mainnet');
    
    // Load wallet
    const walletPath = path.resolve(process.env.HOME, '.config/solana/id.json');
    const walletKeypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );
    console.log('✅ Loaded wallet:', walletKeypair.publicKey.toString());
    
    // Load configuration
    const config = JSON.parse(fs.readFileSync('treasury-config.json', 'utf-8'));
    console.log('✅ Loaded configuration');
    
    // Step 1: Verify program exists
    console.log('\n📦 Step 1: Verifying Program...');
    const programInfo = await connection.getAccountInfo(new PublicKey(config.programId));
    if (!programInfo) {
      console.log('❌ Program not found. Please deploy first.');
      return;
    }
    console.log('✅ Program found');
    
    // Step 2: Verify BUX token mint
    console.log('\n🪙 Step 2: Verifying BUX Token...');
    const mintInfo = await connection.getAccountInfo(BUX_TOKEN_MINT);
    if (!mintInfo) {
      console.log('❌ BUX token mint not found');
      return;
    }
    console.log('✅ BUX token mint found');
    
    // Step 3: Get user token account
    console.log('\n👤 Step 3: Setting up User Token Account...');
    const userTokenAccount = await getAssociatedTokenAddress(
      BUX_TOKEN_MINT,
      walletKeypair.publicKey
    );
    console.log('✅ User token account address:', userTokenAccount.toString());
    
    // Check if user token account exists
    let userTokenAccountExists = false;
    try {
      await getAccount(connection, userTokenAccount);
      userTokenAccountExists = true;
      console.log('✅ User token account exists');
    } catch (error) {
      console.log('❌ User token account does not exist, will create it');
    }
    
    // Step 4: Get treasury addresses
    console.log('\n🏦 Step 4: Getting Treasury Addresses...');
    const treasuryAuthority = new PublicKey(config.treasuryAuthority);
    const treasuryTokenAccount = new PublicKey(config.treasuryTokenAccount);
    
    console.log('✅ Treasury Authority:', treasuryAuthority.toString());
    console.log('✅ Treasury Token Account:', treasuryTokenAccount.toString());
    
    // Step 5: Check treasury balance
    console.log('\n💰 Step 5: Checking Treasury Balance...');
    try {
      const treasuryAccount = await getAccount(connection, treasuryTokenAccount);
      const treasuryBalance = Number(treasuryAccount.amount) / 1e9;
      console.log('✅ Treasury balance:', treasuryBalance, 'BUX');
      
      if (treasuryBalance < 1) {
        console.log('⚠️  Warning: Low treasury balance. Need at least 1 BUX for testing.');
      }
    } catch (error) {
      console.log('❌ Treasury token account not found or not initialized');
      console.log('   This needs to be set up before testing claims');
      return;
    }
    
    // Step 6: Create claim instruction
    console.log('\n🔧 Step 6: Creating Claim Transaction...');
    
    // Test amount: 1 BUX (1e9 lamports)
    const testAmount = 1_000_000_000; // 1 BUX
    
    // Create the claim instruction data
    const instructionData = Buffer.alloc(16);
    
    // Anchor discriminator for "claim" instruction
    const claimDiscriminator = Buffer.from([
      0x3e, 0xc6, 0xd6, 0xc1, 0xd5, 0x9f, 0x6c, 0xd2
    ]);
    instructionData.set(claimDiscriminator, 0);
    
    // Amount as little-endian u64
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(BigInt(testAmount), 0);
    instructionData.set(amountBuffer, 8);
    
    // Create transaction
    const transaction = new Transaction();
    
    // Add create token account instruction if needed
    if (!userTokenAccountExists) {
      console.log('📝 Adding create token account instruction');
      const createAccountInstruction = createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey, // payer
        userTokenAccount, // associated token account
        walletKeypair.publicKey, // owner
        BUX_TOKEN_MINT // mint
      );
      transaction.add(createAccountInstruction);
    }
    
    // Create the claim instruction
    const claimInstruction = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: treasuryTokenAccount, isSigner: false, isWritable: true },
        { pubkey: userTokenAccount, isSigner: false, isWritable: true },
        { pubkey: treasuryAuthority, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: instructionData
    };
    
    transaction.add(claimInstruction);
    
    // Step 7: Send transaction
    console.log('\n🚀 Step 7: Sending Claim Transaction...');
    console.log('   Amount:', testAmount / 1e9, 'BUX');
    console.log('   This will cost approximately 0.000005 SOL');
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletKeypair.publicKey;
    
    // Sign and send transaction
    const signature = await connection.sendTransaction(transaction, [walletKeypair]);
    console.log('✅ Transaction sent with signature:', signature);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    
    if (confirmation.value.err) {
      console.log('❌ Transaction failed:', confirmation.value.err);
      return;
    }
    
    console.log('✅ Transaction confirmed!');
    
    // Step 8: Verify balance
    console.log('\n✅ Step 8: Verifying User Balance...');
    try {
      const userAccount = await getAccount(connection, userTokenAccount);
      const userBalance = Number(userAccount.amount) / 1e9;
      console.log('✅ User balance:', userBalance, 'BUX');
    } catch (error) {
      console.log('❌ Error checking user balance:', error.message);
    }
    
    console.log('\n🎉 Mainnet claim test completed successfully!');
    console.log('   Transaction signature:', signature);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMainnetClaim(); 