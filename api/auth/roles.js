import express from 'express';
import pool from '../../config/database.js';
import { syncUserRoles } from '../integrations/discord/roles.js';

const router = express.Router();

router.get('/', async (req, res) => {
  let client;
  try {
    // Get user from session
    const user = req.session?.user;
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get client from pool
    client = await pool.connect();
    
    // First ensure the roles column exists
    await client.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'user_roles' 
          AND column_name = 'roles'
        ) THEN
          ALTER TABLE user_roles ADD COLUMN roles JSONB DEFAULT '[]'::jsonb;
        END IF;
      END $$;
    `);
    
    // Create user record if it doesn't exist
    await client.query(`
      INSERT INTO user_roles (discord_id, discord_name, wallet_address, roles)
      VALUES ($1, $2, $3, '[]'::jsonb)
      ON CONFLICT (discord_id) 
      DO UPDATE SET 
        discord_name = EXCLUDED.discord_name,
        wallet_address = EXCLUDED.wallet_address,
        last_updated = CURRENT_TIMESTAMP
    `, [user.discord_id, user.discord_username, user.wallet_address]);
    
    // Get user roles and holdings from database
    const result = await client.query(`
      SELECT 
        ur.*,
        json_agg(
          json_build_object(
            'id', r.discord_role_id,
            'name', r.name,
            'type', r.type,
            'collection', r.collection
          )
        ) as discord_roles
      FROM user_roles ur
      LEFT JOIN roles r ON (
        (r.type = 'holder' AND (
          (r.collection = 'fcked_catz' AND ur.fcked_catz_holder) OR
          (r.collection = 'money_monsters' AND ur.money_monsters_holder) OR
          (r.collection = 'ai_bitbots' AND ur.ai_bitbots_holder) OR
          (r.collection = 'moneymonsters3d' AND ur.moneymonsters3d_holder) OR
          (r.collection = 'celebcatz' AND ur.celebcatz_holder)
        )) OR
        (r.type = 'whale' AND (
          (r.collection = 'fcked_catz' AND ur.fcked_catz_whale) OR
          (r.collection = 'money_monsters' AND ur.money_monsters_whale) OR
          (r.collection = 'ai_bitbots' AND ur.ai_bitbots_whale) OR
          (r.collection = 'moneymonsters3d' AND ur.moneymonsters3d_whale)
        )) OR
        (r.type = 'token' AND r.collection = 'bux' AND (
          (r.name = 'BUX Beginner' AND ur.bux_beginner) OR
          (r.name = 'BUX Builder' AND ur.bux_builder) OR
          (r.name = 'BUX Saver' AND ur.bux_saver) OR
          (r.name = 'BUX Banker' AND ur.bux_banker)
        )) OR
        (r.type = 'special' AND r.name = 'BUXDAO 5' AND ur.buxdao_5)
      )
      WHERE ur.discord_id = $1
      GROUP BY ur.discord_id
    `, [user.discord_id]);

    if (!result.rows[0]) {
      return res.status(200).json({ roles: [], holdings: {} });
    }

    const userData = result.rows[0];
    const holdings = {
      fckedCatz: userData.fcked_catz_holder,
      moneyMonsters: userData.money_monsters_holder,
      aiBitbots: userData.ai_bitbots_holder,
      moneyMonsters3d: userData.moneymonsters3d_holder,
      celebCatz: userData.celebcatz_holder
    };

    // Filter out null roles and update the roles in user_roles
    const roles = userData.discord_roles.filter(role => role !== null);
    await client.query(`
      UPDATE user_roles 
      SET roles = $1::jsonb 
      WHERE discord_id = $2
    `, [JSON.stringify(roles), user.discord_id]);

    // Sync roles with Discord if we have a wallet connected
    if (userData.wallet_address) {
      const guildId = process.env.DISCORD_GUILD_ID;
      await syncUserRoles(user.discord_id, guildId);
    }

    res.status(200).json({
      roles,
      holdings
    });

  } catch (error) {
    console.error('Error in roles endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (client) {
      client.release();
    }
  }
});

export default router; 