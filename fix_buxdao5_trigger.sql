CREATE OR REPLACE FUNCTION manage_buxdao5_role()
RETURNS TRIGGER AS $$
DECLARE
  buxdao5_role_id text;
  role_obj jsonb;
  role_data record;
BEGIN
  RAISE NOTICE 'Starting manage_buxdao5_role for user: %', NEW.discord_id;
  
  -- Check if all collection holder roles are true
  IF NEW.fcked_catz_holder = true AND
     NEW.money_monsters_holder = true AND
     NEW.ai_bitbots_holder = true AND
     NEW.moneymonsters3d_holder = true AND
     NEW.celebcatz_holder = true THEN
    -- Get the BUXDAO 5 role data
    SELECT * INTO role_data FROM roles WHERE name = 'BUXDAO 5';
    RAISE NOTICE 'Found BUXDAO 5 role data: %', role_data;
    NEW.buxdao_5 = true;
    
    -- Check if BUXDAO 5 role is already in the array
    IF NOT EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(NEW.roles) 
      WHERE (value->>'id') = role_data.discord_role_id
    ) THEN
      -- Create new role object with all properties
      role_obj = jsonb_build_object(
        'id', role_data.discord_role_id,
        'name', role_data.name,
        'type', role_data.type,
        'collection', role_data.collection,
        'display_name', role_data.display_name,
        'color', role_data.color,
        'emoji_url', role_data.emoji_url
      );
      RAISE NOTICE 'Adding BUXDAO 5 role: %', role_obj;
      -- Add to roles array
      NEW.roles = NEW.roles || role_obj;
      RAISE NOTICE 'Updated roles array: %', NEW.roles;
    END IF;
  ELSE
    -- Remove BUXDAO 5 if any collection holder role is false
    NEW.buxdao_5 = false;
    -- Remove BUXDAO 5 role from roles array if present
    SELECT discord_role_id INTO buxdao5_role_id FROM roles WHERE name = 'BUXDAO 5';
    NEW.roles = (
      SELECT jsonb_agg(value)
      FROM jsonb_array_elements(NEW.roles)
      WHERE (value->>'id') != buxdao5_role_id
    );
    RAISE NOTICE 'Removed BUXDAO 5 role, updated roles array: %', NEW.roles;
  END IF;
  RAISE NOTICE 'Finished manage_buxdao5_role for user: %', NEW.discord_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 