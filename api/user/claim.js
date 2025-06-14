import express from 'express';
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount, createTransferInstruction, getAccount, createApproveInstruction, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import bs58 from 'bs58';
import { pool } from '../config/database.js';
import nacl from 'tweetnacl';

const router = express.Router();

// BUX token mint and treasury addresses
const BUX_MINT = new PublicKey('AaKrMsZkuAdJL6TKZbj7X1VaH5qWioL7oDHagQZa1w59');
const TREASURY_WALLET = Keypair.fromSecretKey(bs58.decode(process.env.TREASURY_WALLET_SECRET_KEY));

console.log('TREASURY WALLET CHECK:', {
  fromSecretKey: TREASURY_WALLET.publicKey.toString(),
  expectedAddress: 'FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75',
  matches: TREASURY_WALLET.publicKey.toString() === 'FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75'
});

// Add treasury check endpoint
router.get('/treasury-check', async (req, res) => {
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    console.log('Treasury wallet public key:', TREASURY_WALLET.publicKey.toString());

    // Get treasury token account
    console.log('Getting treasury token account with:', {
      payer: TREASURY_WALLET.publicKey.toString(),
      mint: BUX_MINT.toString(),
      owner: TREASURY_WALLET.publicKey.toString()
    });

    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      TREASURY_WALLET,
      BUX_MINT,
      TREASURY_WALLET.publicKey,
      true // allowOwnerOffCurve
    );

    console.log('Got treasury token account:', {
      address: treasuryTokenAccount.address.toString(),
      mint: treasuryTokenAccount.mint.toString(),
      owner: treasuryTokenAccount.owner.toString()
    });

    // Verify treasury token account
    const treasuryAccount = await getAccount(
      connection,
      treasuryTokenAccount.address,
      'confirmed',
      TOKEN_PROGRAM_ID
    );

    // Detailed account verification
    console.log('DETAILED ACCOUNT VERIFICATION:', {
      treasuryWallet: TREASURY_WALLET.publicKey.toString(),
      tokenAccount: treasuryTokenAccount.address.toString(),
      isInitialized: treasuryAccount.isInitialized,
      mint: treasuryAccount.mint.toString(),
      owner: treasuryAccount.owner.toString(),
      amount: treasuryAccount.amount.toString(),
      state: treasuryAccount.state,
      closeAuthority: treasuryAccount.closeAuthority?.toString() || 'none'
    });

    // Check if account is properly initialized
    if (!treasuryAccount.isInitialized) {
      return res.status(400).json({
        error: 'Treasury token account not initialized',
        details: {
          tokenAccount: treasuryTokenAccount.address.toString(),
          mint: BUX_MINT.toString(),
          owner: TREASURY_WALLET.publicKey.toString()
        }
      });
    }

    // Immediate balance check
    console.log('IMMEDIATE TREASURY BALANCE CHECK:', {
      address: treasuryTokenAccount.address.toString(),
      balance: Number(treasuryAccount.amount),
      balanceFormatted: Number(treasuryAccount.amount) / 1e9,
      mint: treasuryAccount.mint.toString(),
      owner: treasuryAccount.owner.toString()
    });

    if (Number(treasuryAccount.amount) === 0) {
      console.log('WARNING: Treasury account has zero balance');
      return res.status(400).json({
        error: 'Treasury account has no tokens',
        details: {
          treasuryAddress: treasuryTokenAccount.address.toString(),
          treasuryWallet: TREASURY_WALLET.publicKey.toString(),
          mint: BUX_MINT.toString()
        }
      });
    }

    res.json({
      treasuryWallet: TREASURY_WALLET.publicKey.toString(),
      tokenAccount: treasuryTokenAccount.address.toString(),
      buxBalance: Number(treasuryAccount.amount) / 1e9
    });

  } catch (error) {
    console.error('Treasury check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add treasury check endpoint
router.get('/check-balance', async (req, res) => {
  try {
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    // Get treasury token account
    const treasuryTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      TREASURY_WALLET.publicKey,
      BUX_MINT,
      TREASURY_WALLET.publicKey,
      true // allowOwnerOffCurve
    );

    // Get account info
    const accountInfo = await getAccount(
      connection,
      treasuryTokenAccount.address,
      'confirmed',
      TOKEN_PROGRAM_ID
    );

    console.log('Treasury Balance Check:', {
      tokenAccount: treasuryTokenAccount.address.toString(),
      balance: Number(accountInfo.amount),
      balanceFormatted: Number(accountInfo.amount) / 1e9,
      owner: accountInfo.owner.toString(),
      mint: accountInfo.mint.toString()
    });

    res.json({
      tokenAccount: treasuryTokenAccount.address.toString(),
      balance: Number(accountInfo.amount) / 1e9,
      owner: accountInfo.owner.toString()
    });

  } catch (error) {
    console.error('Balance check error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;
    
    if (!walletAddress || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Regular claim request
    const claimAmount = parseFloat(amount);
    if (isNaN(claimAmount) || claimAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // Check user's unclaimed rewards
    const userResult = await pool.query(
      'SELECT unclaimed_amount FROM claim_accounts WHERE wallet_address = $1',
      [walletAddress]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const unclaimedAmount = parseFloat(userResult.rows[0].unclaimed_amount);
    if (claimAmount > unclaimedAmount) {
      return res.status(400).json({ error: 'Claim amount exceeds unclaimed rewards' });
    }

    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    // Create transfer instruction
    const userPubkey = new PublicKey(walletAddress);
    const treasuryATA = await getOrCreateAssociatedTokenAccount(
      connection,
      userPubkey,
      BUX_MINT,
      TREASURY_WALLET.publicKey,
      true
    );

    // Get user's token account address
    const userATAAddress = await getAssociatedTokenAddress(BUX_MINT, userPubkey);
    
    // Create transaction with transfer instruction
    const transaction = new Transaction();
    
    // Add transfer instruction with explicit program ID
    transaction.add(
      createTransferInstruction(
        treasuryATA.address,
        userATAAddress,
        TREASURY_WALLET.publicKey,
        BigInt(claimAmount * 1e9),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // Add proper transaction metadata
    transaction.feePayer = userPubkey;
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    // Sign with treasury first
    transaction.sign(TREASURY_WALLET);

    // Return signed transaction with explicit metadata
    res.json({
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      skipPreflight: true,
      maxRetries: 3,
      preflightCommitment: 'confirmed'
    });

  } catch (error) {
    console.error('Claim error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move database updates to the confirm endpoint
router.post('/confirm', async (req, res) => {
  const { signature, walletAddress, amount } = req.body;
  if (!signature || !walletAddress || !amount) {
    return res.status(400).json({ error: 'Missing signature, wallet address or amount' });
  }

  console.log('Confirming claim:', { signature, walletAddress, amount });

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Ensure tables exist with correct schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS claim_transactions (
        id SERIAL PRIMARY KEY,
        discord_id VARCHAR(255),
        wallet_address TEXT NOT NULL,
        amount INTEGER NOT NULL,
        signature TEXT UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Wait 2 seconds before checking status to allow transaction to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get discord_id from claim_accounts
    const userResult = await client.query(
      'SELECT discord_id FROM claim_accounts WHERE wallet_address = $1',
      [walletAddress]
    );

    if (!userResult.rows[0]?.discord_id) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found in claim_accounts' });
    }

    const discord_id = userResult.rows[0].discord_id;

    // Verify transaction on Solana
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    console.log('Checking signature status:', signature);
    
    try {
      // Try to get the full transaction first
      console.log('Attempting to get transaction:', {
        signature,
        rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
      });

      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0
      });

      console.log('Transaction fetch result:', {
        found: !!tx,
        hasError: !!tx?.meta?.err,
        error: tx?.meta?.err,
        status: tx?.meta?.status,
        confirmations: tx?.confirmations
      });

      if (!tx || tx.meta?.err) {
        console.error('Transaction verification failed:', {
          error: tx?.meta?.err,
          raw: tx
        });
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Transaction failed on Solana' });
      }

      console.log('Transaction verified successfully');

      // Record claim in database
      const claimResult = await client.query(
        `INSERT INTO claim_transactions 
         (discord_id, amount, transaction_hash, status, processed_at) 
         VALUES ($1, $2, $3, 'completed', NOW()) 
         RETURNING id`,
        [discord_id, amount, signature]
      );
      console.log('Claim recorded:', claimResult.rows[0]);

      // Update unclaimed rewards
      const updateResult = await client.query(
        `UPDATE claim_accounts 
         SET unclaimed_amount = unclaimed_amount - $1,
             total_claimed = total_claimed + $1,
             last_claim_time = NOW()
         WHERE discord_id = $2
         RETURNING unclaimed_amount, total_claimed`,
        [amount, discord_id]
      );
      console.log('Claim account updated:', updateResult.rows[0]);

      // Update user's BUX balance
      const balanceResult = await client.query(
        `INSERT INTO bux_holders (wallet_address, balance, owner_discord_id, last_updated)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (wallet_address) 
         DO UPDATE SET 
           balance = bux_holders.balance + $2,
           owner_discord_id = EXCLUDED.owner_discord_id,
           last_updated = NOW()
         RETURNING balance`,
        [walletAddress, amount, discord_id]
      );
      console.log('BUX balance updated:', balanceResult.rows[0]);

      await client.query('COMMIT');
      console.log('Database transaction committed successfully');

      res.json({ 
        success: true,
        newBalance: balanceResult.rows[0]?.balance,
        unclaimedAmount: updateResult.rows[0]?.unclaimed_amount
      });

    } catch (txError) {
      console.error('Error verifying transaction:', {
        error: txError.message,
        stack: txError.stack,
        name: txError.name
      });
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Failed to verify transaction: ' + txError.message });
    }

  } catch (error) {
    console.error('Error confirming claim:', error);
    if (client) {
      console.log('Rolling back database transaction');
      await client.query('ROLLBACK');
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

// Add treasury signing endpoint
router.post('/sign', async (req, res) => {
  try {
    const { serializedTx } = req.body;
    
    if (!serializedTx) {
      return res.status(400).json({ error: 'Missing serialized transaction' });
    }

    // Deserialize transaction
    const transaction = Transaction.from(Buffer.from(serializedTx, 'base64'));
    
    // Sign with treasury
    transaction.partialSign(TREASURY_WALLET);
    
    // Verify treasury signature
    const message = transaction.serializeMessage();
    const signature = transaction.signatures.find(
      sig => sig.publicKey.equals(TREASURY_WALLET.publicKey)
    )?.signature;
    
    if (!signature || !nacl.sign.detached.verify(
      message,
      signature,
      TREASURY_WALLET.publicKey.toBytes()
    )) {
      return res.status(500).json({ error: 'Treasury signature verification failed' });
    }
    
    // Serialize and return
    const signedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    });

    res.json({
      signedTransaction: signedTransaction.toString('base64')
    });

  } catch (error) {
    console.error('Treasury signing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// New endpoint to finalize claim after user signs
router.post('/finalize', async (req, res) => {
  const { signedTransaction, amount, walletAddress } = req.body;
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Get user's Discord ID
    const userResult = await client.query(
      'SELECT discord_id FROM claim_accounts WHERE wallet_address = $1',
      [walletAddress]
    );

    if (!userResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const discord_id = userResult.rows[0].discord_id;

    // 1. Update unclaimed amount FIRST
    const updateResult = await client.query(
      `UPDATE claim_accounts 
       SET unclaimed_amount = unclaimed_amount - $1,
           total_claimed = total_claimed + $1,
           last_claim_time = NOW()
       WHERE wallet_address = $2 AND unclaimed_amount >= $1
       RETURNING unclaimed_amount`,
      [amount, walletAddress]
    );

    if (!updateResult.rows[0]) {
      console.error('Failed to update unclaimed amount - possible race condition');
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to update unclaimed amount' });
    }

    // 2. Update user's BUX balance
    const balanceResult = await client.query(
      `INSERT INTO bux_holders (wallet_address, balance, owner_discord_id, last_updated)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (wallet_address)
       DO UPDATE SET
         balance = bux_holders.balance + $2,
         owner_discord_id = EXCLUDED.owner_discord_id,
         last_updated = NOW()
       RETURNING balance`,
      [walletAddress, amount, discord_id]
    );

    if (!balanceResult.rows[0]) {
      console.error('Failed to update BUX balance');
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to update BUX balance' });
    }

    // Now proceed with blockchain transaction
    const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));
    
    // Verify the transaction amount matches the claim amount
    const transferInstruction = transaction.instructions[0];
    if (!transferInstruction || transferInstruction.programId.toString() !== TOKEN_PROGRAM_ID.toString()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid transaction: not a token transfer' });
    }

    // Add the treasury signature
    transaction.partialSign(TREASURY_WALLET);

    // Broadcast the transaction
    const connection = new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    console.log('Broadcasting transaction...');
    const signature = await connection.sendRawTransaction(transaction.serialize());
    console.log('Transaction broadcasted with signature:', signature);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');
    if (confirmation.value.err) {
      console.error('Transaction failed:', confirmation.value.err);
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Transaction failed' });
    }

    // If we get here, both DB update and blockchain transaction succeeded
    await client.query('COMMIT');

    res.json({
      success: true,
      signature,
      newBalance: balanceResult.rows[0].balance,
      unclaimedAmount: updateResult.rows[0].unclaimed_amount
    });

  } catch (error) {
    console.error('Error in finalize:', error);
    if (client) {
      await client.query('ROLLBACK');
    }
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

export default router; 