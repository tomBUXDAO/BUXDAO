-- Function to manage whale roles
CREATE OR REPLACE FUNCTION manage_whale_roles()
RETURNS TRIGGER AS $$
DECLARE
  whale_role record;
  role_obj jsonb;
BEGIN
  -- Check each collection for whale status
  -- AI BitBots Whale
  IF NEW.ai_bitbots_holder >= 10 AND NOT NEW.ai_bitbots_whale THEN
    NEW.ai_bitbots_whale := true;
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'ai_bitbots';
    IF whale_role IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.roles) WHERE (value->>'id') = whale_role.discord_role_id
    ) THEN
      role_obj := jsonb_build_object(
        'id', whale_role.discord_role_id,
        'name', whale_role.name,
        'type', whale_role.type,
        'collection', whale_role.collection,
        'display_name', whale_role.display_name,
        'color', whale_role.color,
        'emoji_url', whale_role.emoji_url
      );
      NEW.roles := NEW.roles || role_obj;
    END IF;
  ELSIF NEW.ai_bitbots_holder < 10 AND NEW.ai_bitbots_whale THEN
    NEW.ai_bitbots_whale := false;
    SELECT discord_role_id INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'ai_bitbots';
    IF whale_role IS NOT NULL THEN
      NEW.roles := (
        SELECT jsonb_agg(value)
        FROM jsonb_array_elements(NEW.roles)
        WHERE (value->>'id') != whale_role.discord_role_id
      );
    END IF;
  END IF;

  -- Money Monsters Whale
  IF NEW.money_monsters_holder >= 10 AND NOT NEW.money_monsters_whale THEN
    NEW.money_monsters_whale := true;
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'money_monsters';
    IF whale_role IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.roles) WHERE (value->>'id') = whale_role.discord_role_id
    ) THEN
      role_obj := jsonb_build_object(
        'id', whale_role.discord_role_id,
        'name', whale_role.name,
        'type', whale_role.type,
        'collection', whale_role.collection,
        'display_name', whale_role.display_name,
        'color', whale_role.color,
        'emoji_url', whale_role.emoji_url
      );
      NEW.roles := NEW.roles || role_obj;
    END IF;
  ELSIF NEW.money_monsters_holder < 10 AND NEW.money_monsters_whale THEN
    NEW.money_monsters_whale := false;
    SELECT discord_role_id INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'money_monsters';
    IF whale_role IS NOT NULL THEN
      NEW.roles := (
        SELECT jsonb_agg(value)
        FROM jsonb_array_elements(NEW.roles)
        WHERE (value->>'id') != whale_role.discord_role_id
      );
    END IF;
  END IF;

  -- Money Monsters 3D Whale
  IF NEW.moneymonsters3d_holder >= 10 AND NOT NEW.moneymonsters3d_whale THEN
    NEW.moneymonsters3d_whale := true;
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'moneymonsters3d';
    IF whale_role IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.roles) WHERE (value->>'id') = whale_role.discord_role_id
    ) THEN
      role_obj := jsonb_build_object(
        'id', whale_role.discord_role_id,
        'name', whale_role.name,
        'type', whale_role.type,
        'collection', whale_role.collection,
        'display_name', whale_role.display_name,
        'color', whale_role.color,
        'emoji_url', whale_role.emoji_url
      );
      NEW.roles := NEW.roles || role_obj;
    END IF;
  ELSIF NEW.moneymonsters3d_holder < 10 AND NEW.moneymonsters3d_whale THEN
    NEW.moneymonsters3d_whale := false;
    SELECT discord_role_id INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'moneymonsters3d';
    IF whale_role IS NOT NULL THEN
      NEW.roles := (
        SELECT jsonb_agg(value)
        FROM jsonb_array_elements(NEW.roles)
        WHERE (value->>'id') != whale_role.discord_role_id
      );
    END IF;
  END IF;

  -- Fcked Catz Whale
  IF NEW.fcked_catz_holder >= 10 AND NOT NEW.fcked_catz_whale THEN
    NEW.fcked_catz_whale := true;
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'fcked_catz';
    IF whale_role IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.roles) WHERE (value->>'id') = whale_role.discord_role_id
    ) THEN
      role_obj := jsonb_build_object(
        'id', whale_role.discord_role_id,
        'name', whale_role.name,
        'type', whale_role.type,
        'collection', whale_role.collection,
        'display_name', whale_role.display_name,
        'color', whale_role.color,
        'emoji_url', whale_role.emoji_url
      );
      NEW.roles := NEW.roles || role_obj;
    END IF;
  ELSIF NEW.fcked_catz_holder < 10 AND NEW.fcked_catz_whale THEN
    NEW.fcked_catz_whale := false;
    SELECT discord_role_id INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'fcked_catz';
    IF whale_role IS NOT NULL THEN
      NEW.roles := (
        SELECT jsonb_agg(value)
        FROM jsonb_array_elements(NEW.roles)
        WHERE (value->>'id') != whale_role.discord_role_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_manage_whale_roles ON user_roles;
CREATE TRIGGER trigger_manage_whale_roles
  BEFORE INSERT OR UPDATE
  ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION manage_whale_roles(); 