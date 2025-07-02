import { pool } from './api/config/database.js';

async function fixClaimBalance() {
  const walletAddress = 'AcWwsEwgcEHz6rzUTXcnSksFZbETtc2JhA4jF7PKjp9T';
  const amount = 3507;
  const discord_id = '931160720261939230';

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    console.log('Fixing claim balance for:', { walletAddress, amount, discord_id });

    // Update unclaimed rewards (reduce by the amount claimed)
    const updateResult = await client.query(
      `UPDATE claim_accounts 
       SET unclaimed_amount = unclaimed_amount - $1,
           total_claimed = total_claimed + $1,
           last_claim_time = NOW()
       WHERE wallet_address = $2
       RETURNING unclaimed_amount, total_claimed`,
      [amount, walletAddress]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('Failed to update claim account');
    }

    console.log('Claim account updated:', updateResult.rows[0]);

    // Update user's BUX balance (add the claimed amount)
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

    // Record the claim transaction
    const claimResult = await client.query(
      `INSERT INTO claim_transactions 
       (discord_id, wallet_address, amount, signature, status, created_at, processed_at) 
       VALUES ($1, $2, $3, 'manual-fix-3507', 'completed', NOW(), NOW()) 
       RETURNING id`,
      [discord_id, walletAddress, amount]
    );

    console.log('Claim transaction recorded:', claimResult.rows[0]);

    await client.query('COMMIT');
    console.log('✅ Balance fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing balance:', error);
    if (client) {
      await client.query('ROLLBACK');
    }
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

fixClaimBalance(); 