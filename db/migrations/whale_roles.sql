-- Create manage_whale_roles function
CREATE OR REPLACE FUNCTION manage_whale_roles()
RETURNS TRIGGER AS $$
DECLARE
  role_data record;
  role_obj jsonb;
  nft_counts record;
BEGIN
  -- Get NFT counts from collection_counts with default values
  SELECT 
    COALESCE(fcked_catz_count, 0) as fcked_catz_count,
    COALESCE(money_monsters_count, 0) as money_monsters_count,
    COALESCE(aibitbots_count, 0) as aibitbots_count,
    COALESCE(money_monsters_3d_count, 0) as money_monsters_3d_count
  INTO nft_counts
  FROM (
    SELECT * FROM collection_counts WHERE wallet_address = NEW.wallet_address
    UNION ALL
    SELECT NEW.wallet_address, NULL, NULL, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP
    LIMIT 1
  ) t;

  -- AI BitBots Whale
  IF nft_counts.aibitbots_count >= 10 AND NOT NEW.ai_bitbots_whale THEN
    SELECT * INTO role_data FROM roles WHERE name = 'AI BitBots Whale';
    NEW.ai_bitbots_whale = true;
    
    -- Add role to array if not present
    IF NOT EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(NEW.roles) 
      WHERE (value->>'id') = role_data.discord_role_id
    ) THEN
      role_obj = jsonb_build_object(
        'id', role_data.discord_role_id,
        'name', role_data.name,
        'type', role_data.type,
        'collection', role_data.collection,
        'display_name', role_data.display_name,
        'color', role_data.color,
        'emoji_url', role_data.emoji_url
      );
      NEW.roles = NEW.roles || role_obj;
    END IF;
  END IF;

  -- FCKed Catz Whale
  IF nft_counts.fcked_catz_count >= 25 AND NOT NEW.fcked_catz_whale THEN
    SELECT * INTO role_data FROM roles WHERE name = 'FCKed Catz Whale';
    NEW.fcked_catz_whale = true;
    
    IF NOT EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(NEW.roles) 
      WHERE (value->>'id') = role_data.discord_role_id
    ) THEN
      role_obj = jsonb_build_object(
        'id', role_data.discord_role_id,
        'name', role_data.name,
        'type', role_data.type,
        'collection', role_data.collection,
        'display_name', role_data.display_name,
        'color', role_data.color,
        'emoji_url', role_data.emoji_url
      );
      NEW.roles = NEW.roles || role_obj;
    END IF;
  END IF;

  -- Money Monsters Whale
  IF nft_counts.money_monsters_count >= 25 AND NOT NEW.money_monsters_whale THEN
    SELECT * INTO role_data FROM roles WHERE name = 'Money Monsters Whale';
    NEW.money_monsters_whale = true;
    
    IF NOT EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(NEW.roles) 
      WHERE (value->>'id') = role_data.discord_role_id
    ) THEN
      role_obj = jsonb_build_object(
        'id', role_data.discord_role_id,
        'name', role_data.name,
        'type', role_data.type,
        'collection', role_data.collection,
        'display_name', role_data.display_name,
        'color', role_data.color,
        'emoji_url', role_data.emoji_url
      );
      NEW.roles = NEW.roles || role_obj;
    END IF;
  END IF;

  -- Money Monsters 3D Whale
  IF nft_counts.money_monsters_3d_count >= 25 AND NOT NEW.moneymonsters3d_whale THEN
    SELECT * INTO role_data FROM roles WHERE name = 'Money Monsters 3D Whale';
    NEW.moneymonsters3d_whale = true;
    
    IF NOT EXISTS (
      SELECT 1 
      FROM jsonb_array_elements(NEW.roles) 
      WHERE (value->>'id') = role_data.discord_role_id
    ) THEN
      role_obj = jsonb_build_object(
        'id', role_data.discord_role_id,
        'name', role_data.name,
        'type', role_data.type,
        'collection', role_data.collection,
        'display_name', role_data.display_name,
        'color', role_data.color,
        'emoji_url', role_data.emoji_url
      );
      NEW.roles = NEW.roles || role_obj;
    END IF;
  END IF;

  -- Also handle removing whale roles if count drops below threshold
  IF nft_counts.aibitbots_count < 10 AND NEW.ai_bitbots_whale THEN
    NEW.ai_bitbots_whale = false;
    -- Remove role from array if present
    SELECT discord_role_id INTO role_data FROM roles WHERE name = 'AI BitBots Whale';
    NEW.roles = (
      SELECT jsonb_agg(value)
      FROM jsonb_array_elements(NEW.roles)
      WHERE (value->>'id') != role_data.discord_role_id
    );
  END IF;

  IF nft_counts.fcked_catz_count < 25 AND NEW.fcked_catz_whale THEN
    NEW.fcked_catz_whale = false;
    SELECT discord_role_id INTO role_data FROM roles WHERE name = 'FCKed Catz Whale';
    NEW.roles = (
      SELECT jsonb_agg(value)
      FROM jsonb_array_elements(NEW.roles)
      WHERE (value->>'id') != role_data.discord_role_id
    );
  END IF;

  IF nft_counts.money_monsters_count < 25 AND NEW.money_monsters_whale THEN
    NEW.money_monsters_whale = false;
    SELECT discord_role_id INTO role_data FROM roles WHERE name = 'Money Monsters Whale';
    NEW.roles = (
      SELECT jsonb_agg(value)
      FROM jsonb_array_elements(NEW.roles)
      WHERE (value->>'id') != role_data.discord_role_id
    );
  END IF;

  IF nft_counts.money_monsters_3d_count < 25 AND NEW.moneymonsters3d_whale THEN
    NEW.moneymonsters3d_whale = false;
    SELECT discord_role_id INTO role_data FROM roles WHERE name = 'Money Monsters 3D Whale';
    NEW.roles = (
      SELECT jsonb_agg(value)
      FROM jsonb_array_elements(NEW.roles)
      WHERE (value->>'id') != role_data.discord_role_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 