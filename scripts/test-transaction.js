import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Helper function to add delay between requests
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to decode price from lamports
function lamportsToSol(lamports) {
  return lamports / 1e9;
}

// Helper to try different price decodings
function tryDecodePrices(data) {
  const results = [];
  
  // Try different offsets (0-32) and both endianness
  for (let offset = 0; offset < Math.min(32, data.length - 8); offset++) {
    try {
      const lePrice = data.readBigUInt64LE(offset);
      const bePrice = data.readBigUInt64BE(offset);
      results.push({
        offset,
        lePrice: Number(lePrice),
        bePrice: Number(bePrice),
        lePriceSol: lamportsToSol(Number(lePrice)),
        bePriceSol: lamportsToSol(Number(bePrice))
      });
    } catch (e) {
      // Ignore read errors
    }
  }
  
  return results;
}

async function checkTransaction(connection, signature) {
  console.log(`\nAnalyzing transaction: ${signature}`);
  
  try {
    await sleep(1000); // Rate limit
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });

    if (!tx) {
      console.log('Transaction not found');
      return;
    }

    // Print all program logs for context
    console.log('\nProgram Logs:');
    tx.meta?.logMessages?.forEach(log => {
      console.log(log);
    });

    // Check if this is a Tensor instruction
    const tensorIx = tx.transaction.message.compiledInstructions.find((ix, index) => {
      const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex].toString();
      return programId === 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN';
    });

    if (!tensorIx) {
      console.log('No Tensor instruction found');
      return;
    }

    // Get instruction data
    const data = Buffer.from(tensorIx.data);
    console.log('\nTensor instruction data (hex):', data.toString('hex'));
    console.log('Data length:', data.length);
    
    // Print each byte for detailed analysis
    console.log('\nByte-by-byte analysis:');
    for (let i = 0; i < data.length; i++) {
      console.log(`Byte ${i}: ${data[i]} (0x${data[i].toString(16)})`);
    }

    const discriminator = data[0];
    console.log(`\nTensor instruction discriminator: ${discriminator} (0x${discriminator.toString(16)})`);
    
    // Check if this is a List instruction (0x36)
    if (discriminator === 0x36) {
      console.log('\nFound List instruction!');
      
      // Price is 8 bytes at offset 8 (little-endian)
      const priceInLamports = data.readBigUInt64LE(8);
      const priceInSol = Number(priceInLamports) / 1e9;
      
      console.log(`List price: ${priceInLamports} lamports (${priceInSol} SOL)`);
      
      // Print relevant accounts
      const accounts = tensorIx.accountKeyIndexes.map(idx => 
        tx.transaction.message.staticAccountKeys[idx].toString()
      );
      
      console.log('\nRelevant accounts:');
      console.log('Tensor Program:', accounts[0]);
      console.log('NFT Mint:', accounts[2]);
      console.log('NFT Token Account:', accounts[3]);
      console.log('Seller Wallet:', accounts[5]);
    }

    // Print all accounts involved
    console.log('\nAccounts involved:');
    tensorIx.accountKeyIndexes.forEach((accIdx, i) => {
      const account = tx.transaction.message.staticAccountKeys[accIdx];
      const isWritable = tx.transaction.message.isAccountWritable(accIdx);
      const isSigner = tx.transaction.message.isAccountSigner(accIdx);
      console.log(`Account ${i}:`);
      console.log(`  Address: ${account.toString()}`);
      console.log(`  Writable: ${isWritable}`);
      console.log(`  Signer: ${isSigner}`);
    });

    // Print balance changes
    if (tx.meta?.preBalances && tx.meta?.postBalances) {
      console.log('\nBalance changes:');
      tx.transaction.message.staticAccountKeys.forEach((account, i) => {
        const preBalance = tx.meta.preBalances[i];
        const postBalance = tx.meta.postBalances[i];
        const change = (postBalance - preBalance) / 1e9; // Convert to SOL
        if (change !== 0) {
          console.log(`${account.toString()}:`);
          console.log(`  Pre: ${preBalance / 1e9} SOL`);
          console.log(`  Post: ${postBalance / 1e9} SOL`);
          console.log(`  Change: ${change} SOL`);
        }
      });
    }

    // Look for inner instructions
    if (tx.meta?.innerInstructions?.length > 0) {
      console.log('\nInner Instructions:');
      tx.meta.innerInstructions.forEach((inner, i) => {
        console.log(`\nInner Instruction Set ${i}:`);
        inner.instructions.forEach((ix, j) => {
          const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex].toString();
          console.log(`\n  Instruction ${j}:`);
          console.log(`  Program: ${programId}`);
          console.log(`  Data: ${Buffer.from(ix.data).toString('hex')}`);
          
          // Print accounts involved in inner instruction
          console.log('  Accounts:');
          ix.accounts.forEach((accIdx, k) => {
            const account = tx.transaction.message.staticAccountKeys[accIdx].toString();
            console.log(`    ${k}: ${account}`);
          });
        });
      });
    }

  } catch (error) {
    console.error('Error processing transaction:', error);
  }
}

async function main() {
  const connection = new Connection('https://thrilling-purple-replica.solana-mainnet.quiknode.pro/628d12e42a5508dc3c9cec8fd7b3f120a03449f7/');
  
  console.log('Getting recent Tensor transactions...');
  
  // Increase limit to 200 transactions
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey('TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'),
    { limit: 200 }
  );
  
  console.log(`Found ${signatures.length} recent transactions\n`);
  
  for (const sig of signatures) {
    console.log(`Checking transaction ${sig.signature}`);
    
    const tx = await connection.getTransaction(sig.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed'
    });
    
    if (!tx) {
      console.log('Transaction not found\n');
      continue;
    }
    
    // Look for token transfers and significant SOL movements
    let hasTokenTransfer = false;
    let hasSolTransfer = false;
    
    if (tx.meta?.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          if (ix.programId.toBase58() === TOKEN_PROGRAM_ID.toBase58()) {
            hasTokenTransfer = true;
          }
        }
      }
    }
    
    if (tx.meta?.postBalances && tx.meta?.preBalances) {
      tx.meta.preBalances.forEach((pre, index) => {
        const post = tx.meta.postBalances[index];
        const change = Math.abs(post - pre);
        if (change > 1000000000) { // More than 1 SOL change
          hasSolTransfer = true;
        }
      });
    }
    
    if (hasTokenTransfer || hasSolTransfer) {
      console.log('\nPotential sale transaction found!');
      console.log('\nTransaction logs:');
      if (tx.meta?.logMessages) {
        tx.meta.logMessages.forEach(log => console.log(log));
      }
      
      console.log('\nBalance changes:');
      if (tx.meta?.postBalances && tx.meta?.preBalances) {
        tx.meta.preBalances.forEach((pre, index) => {
          const post = tx.meta.postBalances[index];
          const change = post - pre;
          if (change !== 0) {
            const address = tx.transaction.message.accountKeys[index].toBase58();
            console.log(`${address}: ${change / LAMPORTS_PER_SOL} SOL`);
          }
        });
      }
      
      console.log('\nToken Program Instructions:');
      if (tx.meta?.innerInstructions) {
        tx.meta.innerInstructions.forEach((inner, i) => {
          inner.instructions.forEach((ix, j) => {
            if (ix.programId.toBase58() === TOKEN_PROGRAM_ID.toBase58()) {
              console.log(`Inner ${i}.${j}: Token instruction`);
              console.log('Data:', Buffer.from(ix.data).toString('hex'));
              console.log('Accounts:');
              ix.accounts.forEach((acc, k) => {
                console.log(`  ${k}: ${tx.transaction.message.accountKeys[acc].toBase58()}`);
              });
            }
          });
        });
      }
      
      console.log('\n----------------------------------------\n');
    }
  }
}

main().catch(console.error); 