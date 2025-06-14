import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { pool } from '../api/config/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function getEnv(name, required = true) {
  const value = process.env[name];
  if (!value && required) throw new Error(`Missing env var: ${name}`);
  return value;
}

const RPC_ENDPOINT = getEnv('QUICKNODE_RPC_URL');
const MINT_ADDRESS = getEnv('BUX_TOKEN_MINT_ADDRESS');

async function getTokenHolders(connection, mintAddress) {
  console.log(`Fetching token holders for mint: ${mintAddress}`);
  const mint = new PublicKey(mintAddress);
  const mintInfo = await connection.getParsedAccountInfo(mint);
  const decimals = (mintInfo.value?.data)?.parsed.info.decimals || 9;
  const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
    filters: [
      { dataSize: 165 },
      { memcmp: { offset: 0, bytes: mint.toBase58() } },
    ],
  });
  const holders = accounts
    .map(account => {
      const data = account.account.data;
      const balance = data.readBigUInt64LE(64);
      const owner = new PublicKey(data.slice(32, 64));
      return {
        address: owner.toBase58(),
        balance: Number(balance) / Math.pow(10, decimals),
        rawBalance: balance.toString()
      };
    })
    .filter(holder => holder.balance > 0)
    .sort((a, b) => b.balance - a.balance);
  return holders;
}

async function main() {
  let client;
  try {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const currentHolders = await getTokenHolders(connection, MINT_ADDRESS);
    console.log(`Found ${currentHolders.length} holders`);
    client = await pool.connect();
    await client.query('BEGIN');
    for (const holder of currentHolders) {
      await client.query(
        `INSERT INTO bux_holders (wallet_address, balance, last_updated)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (wallet_address) 
         DO UPDATE SET 
           balance = $2,
           last_updated = CURRENT_TIMESTAMP`,
        [holder.address, holder.balance]
      );
    }
    const addresses = currentHolders.map(h => h.address);
    if (addresses.length > 0) {
      await client.query(
        `DELETE FROM bux_holders 
         WHERE wallet_address NOT IN (${addresses.map((_, i) => `$${i + 1}`).join(',')})`,
        addresses
      );
    }
    await client.query('COMMIT');
    console.log('Database sync completed successfully');
    console.log({ success: true, holdersCount: currentHolders.length, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in sync process:', error);
    if (client) {
      await client.query('ROLLBACK');
    }
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    process.exit(0);
  }
}

main(); 