import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BuxExchangeDevnet } from "../target/types/bux_exchange_devnet";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo } from "@solana/spl-token";

describe("Simple Token Transfer Test", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.BuxExchangeDevnet as Program<BuxExchangeDevnet>;

  it("Transfers tokens between two accounts", async () => {
    // Create mint
    const mint = await createMint(
      provider.connection,
      provider.wallet.payer,
      provider.wallet.publicKey,
      null,
      9
    );

    // Create source account
    const source = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey
    );

    // Create destination account
    const destination = await createAccount(
      provider.connection,
      provider.wallet.payer,
      mint,
      provider.wallet.publicKey
    );

    // Mint tokens to source
    await mintTo(
      provider.connection,
      provider.wallet.payer,
      mint,
      source,
      provider.wallet.publicKey,
      1000000000
    );

    // Transfer tokens
    await program.methods
      .simpleTransfer(new anchor.BN(100))
      .accounts({
        source,
        destination,
        authority: provider.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  });
}); 