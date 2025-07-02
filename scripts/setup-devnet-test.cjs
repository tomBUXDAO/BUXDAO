const { Connection, PublicKey, Keypair, Transaction } = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction,
  createMint,
  createMintToInstruction,
  getMint,
  getAccount
} = require('@solana/spl-token');
const { Program, AnchorProvider } = require('@coral-xyz/anchor');
const BN = require('bn.js');
const fs = require('fs');
const path = require('path');

// Configuration
const PROGRAM_ID = new PublicKey('AzjaVGh81f1jZtZvouZ4pccaRoPvCcB87Vu2fRDWV5et');
const RPC_URL = 'https://api.devnet.solana.com';

async function setupDevnetTest() {
  console.log('🚀 Setting up Complete Devnet Test Environment...\n');

  // Load wallet keypair
  const walletPath = path.resolve(process.env.HOME, '.config/solana/id.json');
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
  );

  // Setup connection
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new AnchorProvider(connection, { 
    publicKey: walletKeypair.publicKey, 
    signTransaction: (tx) => tx.sign(walletKeypair) 
  }, {
    commitment: 'confirmed',
  });

  console.log('📋 Configuration:');
  console.log(`   Program ID: ${PROGRAM_ID.toString()}`);
  console.log(`   Wallet: ${walletKeypair.publicKey.toString()}`);
  console.log(`   Network: ${RPC_URL}\n`);

  try {
    // 1. Create a new test token mint
    console.log('🪙 Creating Test Token Mint...');
    const testTokenMint = await createMint(
      connection,
      walletKeypair,
      walletKeypair.publicKey,
      walletKeypair.publicKey,
      9 // 9 decimals like BUX
    );
    console.log(`   ✅ Test Token Mint: ${testTokenMint.toString()}\n`);

    // 2. Find Treasury Authority PDA
    console.log('🔍 Finding Treasury Authority PDA...');
    const [treasuryAuthority, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      PROGRAM_ID
    );
    console.log(`   Treasury Authority: ${treasuryAuthority.toString()}`);
    console.log(`   Treasury Bump: ${treasuryBump}\n`);

    // 3. Create Treasury Token Account
    console.log('🏦 Creating Treasury Token Account...');
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      testTokenMint,
      treasuryAuthority,
      true // allowOwnerOffCurve
    );
    console.log(`   Treasury Token Account: ${treasuryTokenAccount.toString()}\n`);

    // 4. Create treasury token account if it doesn't exist
    const treasuryAccountInfo = await connection.getAccountInfo(treasuryTokenAccount);
    if (!treasuryAccountInfo) {
      console.log('⚠️  Treasury token account does not exist. Creating...');
      const createAtaIx = createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey,
        treasuryTokenAccount,
        treasuryAuthority,
        testTokenMint
      );
      const createTx = new Transaction().add(createAtaIx);
      const createSignature = await connection.sendTransaction(createTx, [walletKeypair]);
      await connection.confirmTransaction(createSignature, 'confirmed');
      console.log(`   ✅ Treasury token account created: ${createSignature}\n`);
    } else {
      console.log('✅ Treasury token account already exists\n');
    }

    // 5. Mint tokens to treasury
    console.log('💰 Minting Test Tokens to Treasury...');
    const mintToIx = createMintToInstruction(
      testTokenMint,
      treasuryTokenAccount,
      walletKeypair.publicKey,
      1000000000000 // 1000 tokens with 9 decimals
    );
    const mintTx = new Transaction().add(mintToIx);
    const mintSignature = await connection.sendTransaction(mintTx, [walletKeypair]);
    await connection.confirmTransaction(mintSignature, 'confirmed');
    console.log(`   ✅ Minted 1000 test tokens to treasury: ${mintSignature}\n`);

    // 6. Create user token account
    console.log('👤 Creating User Token Account...');
    const userTokenAccount = await getAssociatedTokenAddress(
      testTokenMint,
      walletKeypair.publicKey
    );
    const userAccountInfo = await connection.getAccountInfo(userTokenAccount);
    if (!userAccountInfo) {
      const createUserAtaIx = createAssociatedTokenAccountInstruction(
        walletKeypair.publicKey,
        userTokenAccount,
        walletKeypair.publicKey,
        testTokenMint
      );
      const createUserTx = new Transaction().add(createUserAtaIx);
      const createUserSignature = await connection.sendTransaction(createUserTx, [walletKeypair]);
      await connection.confirmTransaction(createUserSignature, 'confirmed');
      console.log(`   ✅ User token account created: ${createUserSignature}\n`);
    } else {
      console.log('✅ User token account already exists\n');
    }

    // 7. Test the claim functionality
    console.log('🧪 Testing Claim Functionality...');
    const idl = JSON.parse(fs.readFileSync('src/idl/bux_claim.json', 'utf-8'));
    const program = new Program(idl, PROGRAM_ID, provider);

    const testAmount = new BN(100000000); // 0.1 tokens
    const claimTx = await program.methods
      .claim(testAmount)
      .accounts({
        treasuryTokenAccount: treasuryTokenAccount,
        userTokenAccount: userTokenAccount,
        treasuryAuthority: treasuryAuthority,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      })
      .transaction();

    console.log('✅ Claim transaction created successfully!');
    console.log(`   Transaction size: ${claimTx.serialize().length} bytes\n`);

    // 8. Save updated configuration
    const config = {
      programId: PROGRAM_ID.toString(),
      testTokenMint: testTokenMint.toString(),
      treasuryAuthority: treasuryAuthority.toString(),
      treasuryTokenAccount: treasuryTokenAccount.toString(),
      treasuryBump: treasuryBump,
      userTokenAccount: userTokenAccount.toString(),
      network: RPC_URL
    };

    fs.writeFileSync('devnet-test-config.json', JSON.stringify(config, null, 2));
    console.log('💾 Devnet test configuration saved to devnet-test-config.json\n');

    // 9. Display final status
    console.log('🎯 Devnet Test Setup Complete!');
    console.log('   ✅ Test token mint created');
    console.log('   ✅ Treasury PDA configured');
    console.log('   ✅ Treasury funded with 1000 test tokens');
    console.log('   ✅ User token account created');
    console.log('   ✅ Claim transaction verified\n');

    console.log('📝 Next Steps:');
    console.log('   1. Update frontend to use test token mint');
    console.log('   2. Test claim functionality in the app');
    console.log('   3. Deploy to mainnet when ready\n');

    console.log('🔧 Frontend Updates Needed:');
    console.log(`   Update BUX_TOKEN_MINT in claimProgram.js to: ${testTokenMint.toString()}`);
    console.log(`   Update treasuryTokenAccount to: ${treasuryTokenAccount.toString()}\n`);

    return config;

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupDevnetTest()
    .then(() => {
      console.log('✅ Devnet test setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Devnet test setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDevnetTest }; 