import { PublicKey } from '@solana/web3.js';
import { COLLECTION_ADDRESSES } from '../config/collections.js';

export async function checkHoldings(connection, walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const holdings = {};

    // Initialize holdings for all collections
    for (const [symbol, address] of Object.entries(COLLECTION_ADDRESSES)) {
      holdings[symbol] = 0;
    }

    // Get all token accounts for the wallet
    const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    // Check each token account
    for (const { account } of accounts.value) {
      const mintAddress = account.data.parsed.info.mint;
      const balance = account.data.parsed.info.tokenAmount.uiAmount;

      // Check which collection this token belongs to
      for (const [symbol, address] of Object.entries(COLLECTION_ADDRESSES)) {
        if (mintAddress === address && balance > 0) {
          holdings[symbol] = balance;
          break;
        }
      }
    }

    return holdings;
  } catch (error) {
    console.error('Error checking holdings:', error);
    throw error;
  }
} 