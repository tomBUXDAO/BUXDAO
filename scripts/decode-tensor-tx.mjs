import { Connection, PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import bs58 from 'bs58';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const QUICKNODE_RPC = process.env.QUICKNODE_RPC_URL;
if (!QUICKNODE_RPC) {
    throw new Error('QUICKNODE_RPC_URL not found in environment');
}

const TENSOR_PROGRAM_ID = 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN';

const connection = new Connection(QUICKNODE_RPC);

const LAMPORTS_PER_SOL = 1000000000;

// Tensor V3 instruction layouts
const TENSOR_INSTRUCTIONS = {
  'list_v3': {
    discriminator: '3347596f45774b33', // hex
    accounts: {
      owner: 0,
      cosigner: 1,
      nftMint: 2,
      nftToken: 3,
      nftMetadata: 4,
      tswapPool: 5,
      tokenProgram: 6,
      systemProgram: 7,
      rent: 8,
      tswapOwner: 9,
      tswapPoolMint: 10,
      tswapFeeToken: 11,
      tswapPoolToken: 12,
      ataProgram: 13,
      metadataProgram: 14,
      instructions: 15,
      authRules: 16
    }
  },
  'buy_v3': {
    discriminator: '445947476a6f3837',
    accounts: {
      buyer: 0,
      cosigner: 1,
      poolConfig: 2,
      poolState: 3,
      whitelist: 4,
      nftBuyerToken: 5,
      nftMint: 6,
      tswapOwner: 7,
      tswapPoolMint: 8,
      tswapPoolToken: 9,
      nftSellerToken: 10,
      seller: 11,
      tokenProgram: 12,
      ataProgram: 13,
      systemProgram: 14,
      rent: 15,
      tswapFeeToken: 16,
      feeVault: 17,
      tswapReward: 18,
      metadataProgram: 19,
      instructions: 20,
      authRules: 21,
      nftEscrow: 22,
      tswapEscrow: 23,
      systemProgram2: 24,
      rewardVault: 25,
      rewardOwner: 26,
      rewardToken: 27,
      rewardMint: 28,
      rewardMetadata: 29
    }
  }
};

function decodeTensorInstruction(data, accounts, meta) {
  try {
    // Convert hex data to Buffer
    const dataBuffer = Buffer.from(data, 'hex');
    
    // First 8 bytes are the discriminator
    const discriminatorHex = dataBuffer.slice(0, 8).toString('hex');
    console.log('\nDecoding instruction:');
    console.log('Discriminator (hex):', discriminatorHex);
    console.log('Full data (hex):', data);
    console.log('Full data (base58):', bs58.encode(dataBuffer));

    // Log SOL balance changes
    console.log('\nSOL balance changes:');
    accounts.forEach((account, index) => {
      const pre = meta.preBalances[index];
      const post = meta.postBalances[index];
      if (pre !== post) {
        console.log(`Account ${account}:`);
        console.log(`  Pre: ${pre / LAMPORTS_PER_SOL} SOL`);
        console.log(`  Post: ${post / LAMPORTS_PER_SOL} SOL`);
        console.log(`  Change: ${(post - pre) / LAMPORTS_PER_SOL} SOL`);
      }
    });

    // Log token balance changes
    if (meta.preTokenBalances && meta.postTokenBalances) {
      console.log('\nToken balance changes:');
      meta.preTokenBalances.forEach(pre => {
        const post = meta.postTokenBalances.find(p => p.accountIndex === pre.accountIndex);
        const account = accounts[pre.accountIndex];
        console.log(`Account ${account}:`);
        console.log(`  Pre: ${pre.uiTokenAmount.amount}`);
        console.log(`  Post: ${post ? post.uiTokenAmount.amount : 'null'}`);
        console.log(`  Mint: ${pre.mint}`);
      });
    }

    // Analyze inner instructions for transfers
    if (meta.innerInstructions) {
      console.log('\nAnalyzing inner instructions:');
      meta.innerInstructions.forEach((inner, i) => {
        console.log(`\nInner instruction set ${i}:`);
        inner.instructions.forEach((ix, j) => {
          const program = meta.transaction.message.accountKeys[ix.programId].toBase58();
          console.log(`\n  Instruction ${j}:`);
          console.log(`  Program: ${program}`);
          
          if (program === '11111111111111111111111111111111') {
            // System program instruction
            const data = Buffer.from(ix.data);
            if (data[0] === 2) { // Transfer
              const amount = data.readBigUInt64LE(1);
              const from = accounts[ix.accounts[0]];
              const to = accounts[ix.accounts[1]];
              console.log(`  Transfer: ${amount / BigInt(LAMPORTS_PER_SOL)} SOL`);
              console.log(`  From: ${from}`);
              console.log(`  To: ${to}`);
            }
          }
        });
      });
    }

    if (discriminatorHex === '3347596f45774b33') {
      console.log('\nAction: LIST_V3');
      const layout = TENSOR_INSTRUCTIONS.list_v3;
      console.log('\nRelevant accounts:');
      for (const [role, index] of Object.entries(layout.accounts)) {
        if (accounts[index]) {
          console.log(`${role}: ${accounts[index]}`);
        }
      }
      
      console.log('\nAnalyzing list price:');
      console.log('Data after discriminator:', dataBuffer.slice(8).toString('hex'));
      
    } else if (discriminatorHex === '445947476a6f3837') {
      console.log('\nAction: BUY_V3');
      const layout = TENSOR_INSTRUCTIONS.buy_v3;
      console.log('\nRelevant accounts:');
      for (const [role, index] of Object.entries(layout.accounts)) {
        if (accounts[index]) {
          console.log(`${role}: ${accounts[index]}`);
        }
      }
    }
  } catch (error) {
    console.error('Error decoding instruction:', error);
  }
}

async function getRecentTransactions() {
    const mintAddress = '9afrBK6dNLfTRKi9iHqJyLMDrwZaZfTZMtFhu1xWHG9m';
    const mint = new PublicKey(mintAddress);
    
    console.log('Fetching data for NFT:', mintAddress);
    
    // Get token accounts
    const tokenAccounts = await connection.getTokenLargestAccounts(mint);
    const tokenAccount = tokenAccounts.value[0].address;
    console.log('Token Account:', tokenAccount.toBase58());

    // Get recent transactions
    const signatures = await connection.getSignaturesForAddress(tokenAccount, { limit: 5 });
    console.log(`Found ${signatures.length} recent transactions\n`);
    
    for (const sig of signatures) {
        console.log('=====================================');
        console.log('Transaction:', sig.signature);
        
        const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });
        
        if (!tx) {
            console.log('Transaction not found');
            continue;
        }
        
        console.log('BlockTime:', new Date(tx.blockTime * 1000).toISOString());
        
        // Log instructions
        console.log('\nInstructions:');
        tx.transaction.message.instructions.forEach((ix, i) => {
            const programId = tx.transaction.message.accountKeys[ix.programIdIndex].toBase58();
            console.log(`\nInstruction ${i}:`);
            console.log('Program:', programId);
            
            // If it's a Tensor instruction, decode it
            if (programId === TENSOR_PROGRAM_ID) {
                const data = Buffer.from(ix.data).toString('hex');
                const accounts = ix.accounts.map(idx => tx.transaction.message.accountKeys[idx].toBase58());
                decodeTensorInstruction(data, accounts, tx.meta);
            }
        });
    }
}

getRecentTransactions().catch(console.error); 