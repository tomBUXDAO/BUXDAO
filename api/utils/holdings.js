import { PublicKey } from '@solana/web3.js';

// Collection addresses
const COLLECTIONS = {
  fckedCatz: 'FCKEDcaTZZxf6c3tF3JYb7PhBZzXhQwEBDuSP6GSi9Q',
  moneyMonsters: 'MMNFTxVtpK2u7PRqRLBf1GDgKYKQg5PpJV1F2ppKxfd',
  aiBitbots: 'AiBiTboTxPRL9knyTKZBEJsNAoXvxjpZwYYpZHzYB5Y',
  moneyMonsters3d: 'MM3DxqWxszLFGQBwjKCQAAGbQHPRJN3UydswgGrWiPZ',
  celebCatz: 'CCATZxVtpK2u7PRqRLBf1GDgKYKQg5PpJV1F2ppKxfd'
};

export async function checkHoldings(connection, walletAddress) {
  try {
    const publicKey = new PublicKey(walletAddress);
    const holdings = {
      fckedCatz: 0,
      moneyMonsters: 0,
      aiBitbots: 0,
      moneyMonsters3d: 0,
      celebCatz: 0
    };

    // Get all token accounts for the wallet
    const accounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    // Check each token account
    for (const { account } of accounts.value) {
      const mintAddress = account.data.parsed.info.mint;
      const balance = account.data.parsed.info.tokenAmount.uiAmount;

      // Check which collection this token belongs to
      for (const [collection, address] of Object.entries(COLLECTIONS)) {
        if (mintAddress === address && balance > 0) {
          holdings[collection] = balance;
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