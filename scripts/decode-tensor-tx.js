import { Connection, PublicKey } from '@solana/web3.js';

const QUICKNODE_RPC = process.env.QUICKNODE_RPC_URL;
const connection = new Connection(QUICKNODE_RPC);

async function getRecentTransactions() {
    const mintAddress = '9afrBK6dNLfTRKi9iHqJyLMDrwZaZfTZMtFhu1xWHG9m';
    const mint = new PublicKey(mintAddress);
    
    // Get token accounts
    const tokenAccounts = await connection.getTokenLargestAccounts(mint);
    const tokenAccount = tokenAccounts.value[0].address;

    // Get recent transactions
    const signatures = await connection.getSignaturesForAddress(tokenAccount, { limit: 5 });
    
    for (const sig of signatures) {
        const tx = await connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
        });
        
        console.log('\nTransaction:', sig.signature);
        console.log('BlockTime:', new Date(tx.blockTime * 1000).toISOString());
        console.log('Instructions:', tx.transaction.message.instructions);
        
        // Log account keys for reference
        console.log('Account Keys:');
        tx.transaction.message.accountKeys.forEach((key, i) => {
            console.log(`${i}: ${key.toBase58()}`);
        });
    }
}

getRecentTransactions().catch(console.error); 