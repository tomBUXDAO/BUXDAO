import express from 'express';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import pool from '../../config/database.js';

const router = express.Router();

// BUX token mint address and treasury PDA
const BUX_MINT = new PublicKey('BUXkvwP9JjzqtH3bkh5j9JH8qFUhvrKHKUnTkqeJHVQz');
const TREASURY_PDA = new PublicKey('BUXTreasuryPDA11111111111111111111111111111');

router.post('/', async (req, res) => {
  if (!req.session?.user?.discord_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Lock and get claim account
    const claimQuery = `
      SELECT * FROM claim_accounts 
      WHERE discord_id = $1 
      FOR UPDATE
    `;
    const claimResult = await client.query(claimQuery, [req.session.user.discord_id]);
    
    if (!claimResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Claim account not found' });
    }

    const claimAccount = claimResult.rows[0];
    
    // Validate amount
    if (amount > claimAccount.unclaimed_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Insufficient unclaimed balance',
        available: claimAccount.unclaimed_amount
      });
    }

    // Create claim transaction record
    const insertTxQuery = `
      INSERT INTO claim_transactions 
        (discord_id, amount, status) 
      VALUES ($1, $2, 'processing')
      RETURNING id
    `;
    const txResult = await client.query(insertTxQuery, [
      req.session.user.discord_id,
      amount
    ]);
    const txId = txResult.rows[0].id;

    // Create Solana transaction
    const connection = new Connection(process.env.SOLANA_RPC_URL);
    
    // Get user's token account
    const userTokenAccount = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(claimAccount.wallet_address),
      { mint: BUX_MINT }
    );

    if (userTokenAccount.value.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No BUX token account found' });
    }

    const userTokenAccountPubkey = userTokenAccount.value[0].pubkey;

    // Create transfer instruction
    const transferIx = createTransferInstruction(
      TREASURY_PDA, // from
      userTokenAccountPubkey, // to
      TREASURY_PDA, // authority
      BigInt(amount),
      [],
      TOKEN_PROGRAM_ID
    );

    // Create transaction
    const transaction = new Transaction().add(transferIx);
    transaction.feePayer = new PublicKey(claimAccount.wallet_address);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Serialize transaction
    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    await client.query('COMMIT');

    // Return unsigned transaction
    res.json({
      transaction: serializedTx,
      txId
    });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error processing claim:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

// Endpoint to confirm transaction
router.post('/confirm', async (req, res) => {
  if (!req.session?.user?.discord_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { txId, signature } = req.body;
  if (!txId || !signature) {
    return res.status(400).json({ error: 'Missing transaction ID or signature' });
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    // Get and lock transaction record
    const txQuery = `
      SELECT t.*, c.unclaimed_amount, c.total_claimed 
      FROM claim_transactions t
      JOIN claim_accounts c ON c.discord_id = t.discord_id
      WHERE t.id = $1 AND t.discord_id = $2
      FOR UPDATE
    `;
    const txResult = await client.query(txQuery, [txId, req.session.user.discord_id]);
    
    if (!txResult.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = txResult.rows[0];
    
    if (tx.status !== 'processing') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    // Verify transaction on Solana
    const connection = new Connection(process.env.SOLANA_RPC_URL);
    const signatureStatus = await connection.getSignatureStatus(signature);
    
    if (!signatureStatus.value?.confirmationStatus || signatureStatus.value.err) {
      // Update transaction as failed
      await client.query(
        'UPDATE claim_transactions SET status = $1, error_message = $2, processed_at = NOW() WHERE id = $3',
        ['failed', 'Transaction failed on Solana', txId]
      );
      await client.query('COMMIT');
      return res.status(400).json({ error: 'Transaction failed on Solana' });
    }

    // Update claim account
    const updateClaimQuery = `
      UPDATE claim_accounts 
      SET 
        unclaimed_amount = unclaimed_amount - $1,
        total_claimed = total_claimed + $1,
        last_claim_time = NOW()
      WHERE discord_id = $2
    `;
    await client.query(updateClaimQuery, [tx.amount, req.session.user.discord_id]);

    // Update transaction as completed
    await client.query(
      'UPDATE claim_transactions SET status = $1, transaction_hash = $2, processed_at = NOW() WHERE id = $3',
      ['completed', signature, txId]
    );

    await client.query('COMMIT');
    res.json({ success: true });

  } catch (error) {
    if (client) await client.query('ROLLBACK');
    console.error('Error confirming claim:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

export default router; 