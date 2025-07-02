const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } = require("@solana/spl-token");

describe("bux_claim", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  it("Can claim tokens!", async () => {
    const program = anchor.workspace.buxClaim;
    const provider = anchor.getProvider();
    
    // Create a test mint
    const mint = await createMint(
      provider.connection,
      provider.wallet,
      provider.wallet.publicKey,
      null,
      9
    );
    
    // Create treasury token account
    const treasuryTokenAccount = await createAccount(
      provider.connection,
      provider.wallet,
      mint,
      provider.wallet.publicKey
    );
    
    // Mint some tokens to treasury
    await mintTo(
      provider.connection,
      provider.wallet,
      mint,
      treasuryTokenAccount,
      provider.wallet,
      1000000000 // 1 token with 9 decimals
    );
    
    // Create user token account
    const userKeypair = Keypair.generate();
    const userTokenAccount = await createAccount(
      provider.connection,
      provider.wallet,
      mint,
      userKeypair.publicKey
    );
    
    // Find treasury authority PDA
    const [treasuryAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
    
    // Test claim
    const amount = new anchor.BN(100000000); // 0.1 tokens
    const tx = await program.methods
      .claim(amount)
      .accounts({
        treasuryTokenAccount: treasuryTokenAccount,
        userTokenAccount: userTokenAccount,
        treasuryAuthority: treasuryAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
      
    console.log("Claim transaction signature:", tx);
  });
});
