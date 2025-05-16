import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  }
});

async function ensureClaimAccounts() {
  const client = await pool.connect();
  try {
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'db', 'create_missing_claim_accounts.sql'),
      'utf8'
    );
    console.log('Ensuring all users have claim accounts...');
    await client.query(sqlScript);
    console.log('Claim account check complete.');
  } catch (error) {
    console.error('Error ensuring claim accounts:', error);
    throw error;
  } finally {
    client.release();
  }
}

ensureClaimAccounts().catch(console.error); 