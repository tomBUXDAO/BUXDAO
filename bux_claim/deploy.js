const anchor = require("@coral-xyz/anchor");
const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

async function deploy() {
  // Configure the connection to the cluster
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  
  // Load the wallet keypair
  const walletPath = path.resolve(process.env.HOME, ".config/solana/id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  
  // Set the provider
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(walletKeypair), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  
  // Build the program
  console.log("Building program...");
  await anchor.build();
  
  // Deploy the program
  console.log("Deploying program...");
  const program = anchor.workspace.buxClaim;
  const programId = program.programId;
  
  console.log("Program deployed to:", programId.toString());
  console.log("Program ID for Anchor.toml:", programId.toString());
  
  // Save the program ID to a file for easy access
  fs.writeFileSync("program-id.txt", programId.toString());
  console.log("Program ID saved to program-id.txt");
}

deploy().catch(console.error); 