import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/:discord_id', async (req, res) => {
  const discord_id = req.params.discord_id;
  if (!discord_id) {
    return res.status(400).json({ error: 'Missing discord_id parameter' });
  }

  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database, fetching data for discord_id:', discord_id);

    // First get the wallet address from user_roles
    const walletQuery = `
      SELECT wallet_address 
      FROM user_roles 
      WHERE discord_id = $1
    `;
    
    const walletResult = await client.query(walletQuery, [discord_id]);
    const wallet_address = walletResult.rows[0]?.wallet_address;
    
    console.log('Wallet address for discord_id:', wallet_address);

    if (!wallet_address) {
      console.log('No wallet address found for discord_id:', discord_id);
      return res.json({
        celeb_catz_count: 0,
        money_monsters_3d_count: 0,
        fcked_catz_count: 0,
        money_monsters_count: 0,
        aibitbots_count: 0,
        ai_collabs_count: 0,
        money_monsters_top_10: 0,
        money_monsters_3d_top_10: 0,
        branded_catz_count: 0,
        total_count: 0,
        balance: 0
      });
    }

    // Get user's NFT holdings from collection_counts table
    const query = `
      SELECT 
        COALESCE(celeb_catz_count, 0) as celeb_catz_count,
        COALESCE(money_monsters_3d_count, 0) as money_monsters_3d_count,
        COALESCE(fcked_catz_count, 0) as fcked_catz_count,
        COALESCE(money_monsters_count, 0) as money_monsters_count,
        COALESCE(aibitbots_count, 0) as aibitbots_count,
        COALESCE(ai_collabs_count, 0) as ai_collabs_count,
        COALESCE(money_monsters_top_10, 0) as money_monsters_top_10,
        COALESCE(money_monsters_3d_top_10, 0) as money_monsters_3d_top_10,
        COALESCE(branded_catz_count, 0) as branded_catz_count,
        COALESCE(total_count, 0) as total_count
      FROM collection_counts 
      WHERE wallet_address = $1
    `;

    console.log('Executing collection counts query for wallet:', wallet_address);
    const result = await client.query(query, [wallet_address]);
    console.log('Collection counts result:', result.rows[0]);
    
    // If no results, return zeros
    if (!result.rows[0]) {
      console.log('No NFTs found for wallet:', wallet_address);
      return res.json({
        celeb_catz_count: 0,
        money_monsters_3d_count: 0,
        fcked_catz_count: 0,
        money_monsters_count: 0,
        aibitbots_count: 0,
        ai_collabs_count: 0,
        money_monsters_top_10: 0,
        money_monsters_3d_top_10: 0,
        branded_catz_count: 0,
        total_count: 0,
        balance: 0
      });
    }

    // Get BUX balance from bux_holders table
    const balanceQuery = `
      SELECT balance
      FROM bux_holders
      WHERE wallet_address = $1
    `;

    console.log('Executing balance query for wallet:', wallet_address);
    const balanceResult = await client.query(balanceQuery, [wallet_address]);
    console.log('Balance result:', balanceResult.rows[0]);

    const response = {
      ...result.rows[0],
      balance: Number(balanceResult.rows[0]?.balance || 0).toFixed(2)
    };

    console.log('Sending response:', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching collection counts:', error);
    if (error.position) {
      console.error('Error position:', error.position);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    if (error.hint) {
      console.error('Error hint:', error.hint);
    }
    res.status(500).json({ error: 'Internal server error', details: error.message });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 