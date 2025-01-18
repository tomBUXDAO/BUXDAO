import express from 'express';
import { parse } from 'cookie';
import pool from '../../config/database.js';
import { syncUserRoles } from '../integrations/discord/roles.js';

const router = express.Router();

router.get('/', async (req, res) => {
  let client;
  try {
    // Get user from cookie instead of session
    const cookies = req.headers.cookie ? parse(req.headers.cookie) : {};
    const discordUser = cookies.discord_user ? JSON.parse(cookies.discord_user) : null;

    if (!discordUser || !discordUser.discord_id) {
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
      INSERT INTO user_roles (discord_id, discord_username, wallet_address, roles)
      VALUES ($1, $2, $3, '[]'::jsonb)
      ON CONFLICT (discord_id) 
      DO UPDATE SET 
        discord_username = EXCLUDED.discord_username,
        wallet_address = EXCLUDED.wallet_address,
        last_updated = CURRENT_TIMESTAMP
    `, [discordUser.discord_id, discordUser.discord_username, discordUser.wallet_address]);
    
    // Get user roles and holdings from database
    const result = await client.query(`
      SELECT 
        ur.*,
        COALESCE(
          (
            SELECT json_agg(role_data)
            FROM (
              SELECT json_build_object(
                'id', r.discord_role_id,
                'name', r.name,
                'type', r.type,
                'collection', r.collection,
                'display_name', COALESCE(r.display_name, r.name),
                'color', COALESCE(r.color, CASE 
                  WHEN r.type = 'token' THEN '#daff00'
                  WHEN r.type = 'holder' THEN '#ff9900'
                  WHEN r.type = 'whale' THEN '#ff0099'
                  ELSE '#ffffff'
                END),
                'emoji_url', COALESCE(r.emoji_url, CASE 
                  WHEN r.type = 'token' THEN '/favicon.ico'
                  ELSE NULL
                END)
              ) as role_data
              FROM roles r
              WHERE (
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
            ) subq
          ),
          '[]'::json
        ) as discord_roles
      FROM user_roles ur
      WHERE ur.discord_id = $1
    `, [discordUser.discord_id]);

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
    `, [JSON.stringify(roles), discordUser.discord_id]);

    // Sync roles with Discord if we have a wallet connected
    if (userData.wallet_address) {
      const guildId = process.env.DISCORD_GUILD_ID;
      await syncUserRoles(discordUser.discord_id, guildId);
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