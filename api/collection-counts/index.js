import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

router.get('/:discord_id', async (req, res) => {
  const discord_id = req.params.discord_id;
  let client;

  try {
    client = await pool.connect();

    // Check if user exists in user_roles
    const userResult = await client.query(
      'SELECT discord_id FROM user_roles WHERE discord_id = $1',
      [discord_id]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({
        error: 'User not found',
        details: `No user found for Discord ID: ${discord_id}`
      });
    }

    // Get user's aggregated NFT holdings from collection_counts_aggregated view
    const query = `
      SELECT 
        COALESCE(celeb_catz_count, 0) as celebcatz_count,
        COALESCE(money_monsters_3d_count, 0) as mm3d_count,
        COALESCE(fcked_catz_count, 0) as fckedcatz_count,
        COALESCE(money_monsters_count, 0) as mm_count,
        COALESCE(aibitbots_count, 0) as aibb_count,
        COALESCE(ai_collabs_count, 0) as ai_collabs_count,
        COALESCE(ai_warriors_count, 0) as shxbb_count,
        COALESCE(ai_secret_squirrels_count, 0) as ausqrl_count,
        COALESCE(ai_energy_apes_count, 0) as aelxaibb_count,
        COALESCE(rejected_bots_ryc_count, 0) as airb_count,
        COALESCE(candybots_count, 0) as clb_count,
        COALESCE(doodlebots_count, 0) as ddbot_count,
        COALESCE(money_monsters_top_10, 0) as money_monsters_top_10,
        COALESCE(money_monsters_3d_top_10, 0) as money_monsters_3d_top_10,
        COALESCE(branded_catz_count, 0) as branded_catz_count,
        COALESCE(total_count, 0) as total_count
      FROM collection_counts_aggregated 
      WHERE discord_id = $1
    `;

    console.log('Executing collection counts query for discord_id:', discord_id);
    const result = await client.query(query, [discord_id]);
    console.log('Collection counts result:', result.rows[0]);
    
    // If no results, return zeros
    if (!result.rows[0]) {
      console.log('No NFTs found for discord_id:', discord_id);
      return res.json({
        celebcatz_count: 0,
        mm3d_count: 0,
        fckedcatz_count: 0,
        mm_count: 0,
        aibb_count: 0,
        shxbb_count: 0,
        ausqrl_count: 0,
        aelxaibb_count: 0,
        airb_count: 0,
        clb_count: 0,
        ddbot_count: 0,
        money_monsters_top_10: 0,
        money_monsters_3d_top_10: 0,
        branded_catz_count: 0,
        total_count: 0,
        balance: 0
      });
    }

    // Get aggregated BUX balance from bux_holders_aggregated view
    const balanceQuery = `
      SELECT total_balance
      FROM bux_holders_aggregated
      WHERE discord_id = $1
    `;

    console.log('Executing balance query for discord_id:', discord_id);
    const balanceResult = await client.query(balanceQuery, [discord_id]);
    console.log('Balance result:', balanceResult.rows[0]);

    const response = {
      celebcatz_count: result.rows[0].celebcatz_count,
      mm3d_count: result.rows[0].mm3d_count,
      fckedcatz_count: result.rows[0].fckedcatz_count,
      mm_count: result.rows[0].mm_count,
      aibb_count: result.rows[0].aibb_count,
      shxbb_count: result.rows[0].shxbb_count,
      ausqrl_count: result.rows[0].ausqrl_count,
      aelxaibb_count: result.rows[0].aelxaibb_count,
      airb_count: result.rows[0].airb_count,
      clb_count: result.rows[0].clb_count,
      ddbot_count: result.rows[0].ddbot_count,
      money_monsters_top_10: result.rows[0].money_monsters_top_10,
      money_monsters_3d_top_10: result.rows[0].money_monsters_3d_top_10,
      branded_catz_count: result.rows[0].branded_catz_count,
      total_count: result.rows[0].total_count,
      balance: Number(balanceResult.rows[0]?.total_balance || 0).toFixed(2)
    };

    return res.json(response);
  } catch (error) {
    console.error('Error fetching collection counts:', error);
    return res.status(500).json({
      error: 'Failed to fetch collection counts',
      details: error.message
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 