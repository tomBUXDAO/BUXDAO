import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey } from '@solana/web3.js';
import { API_BASE_URL } from '../config';
import * as nacl from 'tweetnacl';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const BUX_MINT = new PublicKey('AaKrMsZkuAdJL6TKZbj7X1VaH5qWioL7oDHagQZa1w59');

const BuxClaimButton = ({ 
  amount, 
  onSuccess, 
  onError,
  disabled,
  className,
  children 
}) => {
  const { publicKey, signTransaction, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [isLoading, setIsLoading] = useState(false);

  const handleClaim = async () => {
    if (!publicKey || !signTransaction) {
      onError?.(new Error('Wallet not connected'));
      return;
    }

    setIsLoading(true);
    try {
      // Call claim endpoint
      const response = await fetch(`${API_BASE_URL}/api/user/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          amount: amount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process claim');
      }

      const responseData = await response.json();
      console.log('Raw response data:', responseData);
      
      const { transaction: serializedTx } = responseData; // Get serialized unsigned transaction
      
      console.log('Received from backend:', {
        hasTransaction: !!serializedTx,
        transactionLength: serializedTx?.length
      });

      if (!serializedTx) {
        throw new Error('No transaction received from backend');
      }
      
      // Decode transaction received from backend (it should now be unsigned)
      const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
      
      try {
        // Sign transaction with the user's wallet
        console.log('Requesting user signature...');
        const signedTx = await signTransaction(tx); // Use signTransaction
        console.log('User signed transaction:', signedTx.serialize().toString('base64'));

        // Send the user-signed transaction to the new finalize endpoint
        console.log('Sending signed transaction to finalize endpoint...');
        const finalizeResponse = await fetch(`${API_BASE_URL}/api/user/claim/finalize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            signedTransaction: signedTx.serialize().toString('base64'),
            walletAddress: publicKey.toString(),
            amount: amount // Include amount and walletAddress for backend validation/db update
          })
        });

        if (!finalizeResponse.ok) {
          const error = await finalizeResponse.json();
          throw new Error(error.error || 'Failed to finalize claim in backend');
        }

        const finalizeResult = await finalizeResponse.json();
        console.log('Claim finalized:', finalizeResult);

        if (finalizeResult.success) {
          console.log('Claim successful:', {
            newBalance: finalizeResult.newBalance,
            unclaimedAmount: finalizeResult.unclaimedAmount,
            signature: finalizeResult.signature // Get signature from finalize endpoint response
          });
          onSuccess?.(finalizeResult);

          // Trigger frontend refresh by emitting a custom event
          window.dispatchEvent(new CustomEvent('bux:balanceUpdated', {
            detail: {
              newBalance: finalizeResult.newBalance,
              unclaimedAmount: finalizeResult.unclaimedAmount
            }
          }));
        } else {
          throw new Error('Claim finalization failed');
        }
      } catch (error) {
        console.error('Transaction error:', error);
        onError?.(error instanceof Error ? error : new Error('Unknown error occurred during signing or finalization'));
      }
    } catch (error) {
      console.error('Claim initiation error:', error); // Updated error message
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred during claim initiation'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClaim}
      disabled={disabled || !connected || amount <= 0 || isLoading}
      className={className}
    >
      {children || (isLoading ? 'Claiming...' : 'Claim BUX')}
    </button>
  );
};

export default BuxClaimButton; 