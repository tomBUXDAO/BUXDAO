-- Function to manage whale roles
CREATE OR REPLACE FUNCTION manage_whale_roles()
RETURNS TRIGGER AS $$
DECLARE
  whale_role record;
  role_obj jsonb;
  nft_counts record;
BEGIN
  RAISE NOTICE 'Starting manage_whale_roles for wallet: %', NEW.wallet_address;

  -- Get NFT counts from collection_counts
  SELECT 
    COALESCE(fcked_catz_count, 0) as fcked_catz_count,
    COALESCE(money_monsters_count, 0) as money_monsters_count,
    COALESCE(aibitbots_count, 0) as aibitbots_count,
    COALESCE(money_monsters_3d_count, 0) as money_monsters_3d_count
  INTO nft_counts
  FROM collection_counts
  WHERE wallet_address = NEW.wallet_address;

  RAISE NOTICE 'NFT counts: %', nft_counts;

  -- Initialize nft_counts if no record found
  IF nft_counts IS NULL THEN
    RAISE NOTICE 'No NFT counts found, initializing to zeros';
    SELECT 
      0 as fcked_catz_count,
      0 as money_monsters_count,
      0 as aibitbots_count,
      0 as money_monsters_3d_count
    INTO nft_counts;
  END IF;

  -- AI BitBots Whale
  IF nft_counts.aibitbots_count >= 10 THEN
    RAISE NOTICE 'Adding AI BitBots Whale role';
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'ai_bitbots';
    NEW.ai_bitbots_whale := true;
    
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
      RAISE NOTICE 'Added AI BitBots Whale role: %', role_obj;
    END IF;
  ELSIF nft_counts.aibitbots_count < 10 AND NEW.ai_bitbots_whale THEN
    RAISE NOTICE 'Removing AI BitBots Whale role';
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
  IF nft_counts.money_monsters_count >= 25 THEN
    RAISE NOTICE 'Adding Money Monsters Whale role';
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'money_monsters';
    NEW.money_monsters_whale := true;
    
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
      RAISE NOTICE 'Added Money Monsters Whale role: %', role_obj;
    END IF;
  ELSIF nft_counts.money_monsters_count < 25 AND NEW.money_monsters_whale THEN
    RAISE NOTICE 'Removing Money Monsters Whale role';
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
  IF nft_counts.money_monsters_3d_count >= 25 THEN
    RAISE NOTICE 'Adding Money Monsters 3D Whale role';
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'moneymonsters3d';
    NEW.moneymonsters3d_whale := true;
    
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
      RAISE NOTICE 'Added Money Monsters 3D Whale role: %', role_obj;
    END IF;
  ELSIF nft_counts.money_monsters_3d_count < 25 AND NEW.moneymonsters3d_whale THEN
    RAISE NOTICE 'Removing Money Monsters 3D Whale role';
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
  IF nft_counts.fcked_catz_count >= 25 THEN
    RAISE NOTICE 'Adding FCKed Catz Whale role';
    SELECT * INTO whale_role FROM roles WHERE type = 'whale' AND collection = 'fcked_catz';
    NEW.fcked_catz_whale := true;
    
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
      RAISE NOTICE 'Added FCKed Catz Whale role: %', role_obj;
    END IF;
  ELSIF nft_counts.fcked_catz_count < 25 AND NEW.fcked_catz_whale THEN
    RAISE NOTICE 'Removing FCKed Catz Whale role';
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

  RAISE NOTICE 'Finished manage_whale_roles for wallet: %', NEW.wallet_address;
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