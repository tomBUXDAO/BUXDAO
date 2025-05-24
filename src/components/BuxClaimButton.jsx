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
      
      const { transaction } = responseData;
      
      console.log('Received from backend:', {
        hasTransaction: !!transaction,
        transactionLength: transaction?.length
      });

      if (!transaction) {
        throw new Error('No transaction received from backend');
      }
      
      // Decode transaction that's already signed by treasury
      const tx = Transaction.from(Buffer.from(transaction, 'base64'));
      
      try {
        // Send transaction - this will handle user signing since they are the fee payer
        const signature = await sendTransaction(tx, connection, { skipPreflight: true });
        console.log('Transaction sent:', signature);

        // Immediately update backend since we know the transaction succeeded
        const confirmResponse = await fetch(`${API_BASE_URL}/api/user/claim/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            signature,
            walletAddress: publicKey.toString(),
            amount: amount
          })
        });

        if (!confirmResponse.ok) {
          const error = await confirmResponse.json();
          throw new Error(error.error || 'Failed to confirm claim in backend');
        }

        const confirmResult = await confirmResponse.json();
        console.log('Claim confirmed:', confirmResult);

        if (confirmResult.success) {
          console.log('Claim successful:', {
            newBalance: confirmResult.newBalance,
            unclaimedAmount: confirmResult.unclaimedAmount
          });
          onSuccess?.(confirmResult);

          // Trigger frontend refresh by emitting a custom event
          window.dispatchEvent(new CustomEvent('bux:balanceUpdated', {
            detail: {
              newBalance: confirmResult.newBalance,
              unclaimedAmount: confirmResult.unclaimedAmount
            }
          }));
        } else {
          throw new Error('Claim confirmation failed');
        }
      } catch (error) {
        console.error('Transaction error:', error);
        onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
      }
    } catch (error) {
      console.error('Claim error:', error);
      onError?.(error instanceof Error ? error : new Error('Unknown error occurred'));
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