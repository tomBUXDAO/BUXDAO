const { PublicKey } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const fs = require('fs');

// Configuration
const PROGRAM_ID = new PublicKey('AzjaVGh81f1jZtZvouZ4pccaRoPvCcB87Vu2fRDWV5et');
const BUX_TOKEN_MINT = new PublicKey('AaKrMsZkuAdJL6TKZbj7X1VaH5qWioL7oDHagQZa1w59');

async function getTreasuryAddresses() {
  console.log('🔧 Getting BUX Claim Treasury Addresses...\n');

  try {
    // 1. Find Treasury Authority PDA
    console.log('🔍 Finding Treasury Authority PDA...');
    const [treasuryAuthority, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury')],
      PROGRAM_ID
    );
    console.log(`   Treasury Authority: ${treasuryAuthority.toString()}`);
    console.log(`   Treasury Bump: ${treasuryBump}\n`);

    // 2. Calculate Treasury Token Account Address
    console.log('🏦 Calculating Treasury Token Account Address...');
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      BUX_TOKEN_MINT,
      treasuryAuthority,
      true // allowOwnerOffCurve
    );
    console.log(`   Treasury Token Account: ${treasuryTokenAccount.toString()}\n`);

    // 3. Save configuration
    const config = {
      programId: PROGRAM_ID.toString(),
      buxTokenMint: BUX_TOKEN_MINT.toString(),
      treasuryAuthority: treasuryAuthority.toString(),
      treasuryTokenAccount: treasuryTokenAccount.toString(),
      treasuryBump: treasuryBump
    };

    fs.writeFileSync('treasury-config.json', JSON.stringify(config, null, 2));
    console.log('💾 Configuration saved to treasury-config.json\n');

    // 4. Display next steps
    console.log('🎯 Next Steps:');
    console.log('   1. Fund the treasury with BUX tokens:');
    console.log(`      Transfer BUX to: ${treasuryTokenAccount.toString()}`);
    console.log('   2. Update frontend configuration:');
    console.log(`      Set treasuryTokenAccount to: ${treasuryTokenAccount.toString()}`);
    console.log('   3. Test the claim functionality\n');

    return config;

  } catch (error) {
    console.error('❌ Error getting treasury addresses:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  getTreasuryAddresses()
    .then(() => {
      console.log('✅ Treasury addresses retrieved!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to get treasury addresses:', error);
      process.exit(1);
    });
}

module.exports = { getTreasuryAddresses }; 