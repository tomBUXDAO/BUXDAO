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

async function createDailyRewards() {
  const client = await pool.connect();
  try {
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'create_daily_rewards.sql'),
      'utf8'
    );
    
    console.log('Creating daily rewards...');
    await client.query(sqlScript);
    console.log('Daily rewards created successfully');
  } catch (error) {
    console.error('Error creating daily rewards:', error);
    throw error;
  } finally {
    client.release();
  }
}

createDailyRewards().catch(console.error); 