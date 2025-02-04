CREATE OR REPLACE FUNCTION manage_roles_array() RETURNS trigger AS $$ 
DECLARE 
  roles_array jsonb := '[]'::jsonb;
  top_10_status RECORD;
  role_data RECORD;
BEGIN
  -- Get top 10 status from collection_counts
  SELECT money_monsters_top_10, money_monsters_3d_top_10 INTO top_10_status
  FROM collection_counts 
  WHERE discord_id = NEW.discord_id;

  -- Get role data from roles table
  FOR role_data IN SELECT * FROM roles ORDER BY type, collection LOOP
    CASE 
      -- BUX Token roles
      WHEN role_data.type = 'token' AND role_data.collection = 'bux' THEN
        IF (role_data.name = 'BUX Beginner' AND NEW.bux_beginner) OR
           (role_data.name = 'BUX Builder' AND NEW.bux_builder) OR
           (role_data.name = 'BUX Saver' AND NEW.bux_saver) OR
           (role_data.name = 'BUX Banker' AND NEW.bux_banker) THEN
          roles_array = roles_array || jsonb_build_object(
            'id', role_data.discord_role_id,
            'name', role_data.name,
            'type', role_data.type,
            'color', role_data.color,
            'emoji_url', role_data.emoji_url,
            'collection', role_data.collection,
            'display_name', role_data.display_name
          );
        END IF;

      -- Whale roles
      WHEN role_data.type = 'whale' THEN
        IF (role_data.collection = 'fcked_catz' AND NEW.fcked_catz_whale) OR
           (role_data.collection = 'money_monsters' AND NEW.money_monsters_whale) OR
           (role_data.collection = 'moneymonsters3d' AND NEW.moneymonsters3d_whale) OR
           (role_data.collection = 'ai_bitbots' AND NEW.ai_bitbots_whale) THEN
          roles_array = roles_array || jsonb_build_object(
            'id', role_data.discord_role_id,
            'name', role_data.name,
            'type', role_data.type,
            'color', role_data.color,
            'emoji_url', role_data.emoji_url,
            'collection', role_data.collection,
            'display_name', role_data.display_name
          );
        END IF;

      -- Main collection holder roles
      WHEN role_data.type = 'holder' THEN
        IF (role_data.collection = 'fcked_catz' AND NEW.fcked_catz_holder) OR
           (role_data.collection = 'money_monsters' AND NEW.money_monsters_holder) OR
           (role_data.collection = 'moneymonsters3d' AND NEW.moneymonsters3d_holder) OR
           (role_data.collection = 'ai_bitbots' AND NEW.ai_bitbots_holder) OR
           (role_data.collection = 'celebcatz' AND NEW.celebcatz_holder) THEN
          roles_array = roles_array || jsonb_build_object(
            'id', role_data.discord_role_id,
            'name', role_data.name,
            'type', role_data.type,
            'color', role_data.color,
            'emoji_url', role_data.emoji_url,
            'collection', role_data.collection,
            'display_name', role_data.display_name
          );
        END IF;

      -- Top 10 roles
      WHEN role_data.type = 'top10' THEN
        IF (role_data.collection = 'money_monsters' AND top_10_status.money_monsters_top_10 > 0) OR
           (role_data.collection = 'moneymonsters3d' AND top_10_status.money_monsters_3d_top_10 > 0) THEN
          roles_array = roles_array || jsonb_build_object(
            'id', role_data.discord_role_id,
            'name', role_data.name,
            'type', role_data.type,
            'color', role_data.color,
            'emoji_url', role_data.emoji_url,
            'collection', role_data.collection,
            'display_name', role_data.display_name
          );
        END IF;

      -- BUXDAO 5 role
      WHEN role_data.type = 'special' AND role_data.name = 'BUXDAO 5' AND NEW.buxdao_5 THEN
        roles_array = roles_array || jsonb_build_object(
          'id', role_data.discord_role_id,
          'name', role_data.name,
          'type', role_data.type,
          'color', role_data.color,
          'emoji_url', role_data.emoji_url,
          'collection', role_data.collection,
          'display_name', role_data.display_name
        );

      -- Collaboration collection roles
      WHEN role_data.type = 'collab' THEN
        IF (role_data.collection = 'shxbb' AND NEW.shxbb_holder) OR
           (role_data.collection = 'ausqrl' AND NEW.ausqrl_holder) OR
           (role_data.collection = 'aelxaibb' AND NEW.aelxaibb_holder) OR
           (role_data.collection = 'airb' AND NEW.airb_holder) OR
           (role_data.collection = 'clb' AND NEW.clb_holder) OR
           (role_data.collection = 'ddbot' AND NEW.ddbot_holder) THEN
          roles_array = roles_array || jsonb_build_object(
            'id', role_data.discord_role_id,
            'name', role_data.name,
            'type', role_data.type,
            'color', role_data.color,
            'emoji_url', role_data.emoji_url,
            'collection', role_data.collection,
            'display_name', role_data.display_name
          );
        END IF;
    END CASE;
  END LOOP;

  NEW.roles = roles_array;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 