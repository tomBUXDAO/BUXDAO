CREATE OR REPLACE FUNCTION manage_roles_array() RETURNS trigger AS $$ 
DECLARE 
  roles_array jsonb := '[]'::jsonb;
  top_10_status RECORD;
BEGIN
  -- Get top 10 status from collection_counts
  SELECT money_monsters_top_10, money_monsters_3d_top_10 INTO top_10_status
  FROM collection_counts 
  WHERE discord_id = NEW.discord_id;

  -- 1. Token roles (BUX)
  IF NEW.bux_beginner THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095363984581984357', 'name', 'BUX Beginner', 'type', 'token', 'color', '#daff00', 'emoji_url', '/emojis/BUX.webp', 'collection', 'bux', 'display_name', 'BUX BEGINNER');
  END IF;
  
  IF NEW.bux_builder THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095363984581984357', 'name', 'BUX Builder', 'type', 'token', 'color', '#daff00', 'emoji_url', '/emojis/BUX.webp', 'collection', 'bux', 'display_name', 'BUX BUILDER');
  END IF;
  
  IF NEW.bux_saver THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095363984581984357', 'name', 'BUX Saver', 'type', 'token', 'color', '#daff00', 'emoji_url', '/emojis/BUX.webp', 'collection', 'bux', 'display_name', 'BUX SAVER');
  END IF;
  
  IF NEW.bux_banker THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095363984581984357', 'name', 'BUX Banker', 'type', 'token', 'color', '#daff00', 'emoji_url', '/emojis/BUX.webp', 'collection', 'bux', 'display_name', 'BUX BANKER');
  END IF;

  -- 2. Whale roles
  IF NEW.fcked_catz_whale THEN 
    roles_array = roles_array || jsonb_build_object('id', '1093606438674382858', 'name', 'FCKed Catz Whale', 'type', 'whale', 'color', '#7294ab', 'emoji_url', '/emojis/CAT 🐋.webp', 'collection', 'fcked_catz', 'display_name', 'CAT 🐋');
  END IF;
  
  IF NEW.money_monsters_whale THEN 
    roles_array = roles_array || jsonb_build_object('id', '1093606438674382858', 'name', 'Money Monsters Whale', 'type', 'whale', 'color', '#7294ab', 'emoji_url', '/emojis/MONSTER 🐋.webp', 'collection', 'money_monsters', 'display_name', 'MONSTER 🐋');
  END IF;
  
  IF NEW.moneymonsters3d_whale THEN 
    roles_array = roles_array || jsonb_build_object('id', '1093606579355525252', 'name', 'Money Monsters 3D Whale', 'type', 'whale', 'color', '#52b4f3', 'emoji_url', '/emojis/MONSTER 3D 🐋.webp', 'collection', 'moneymonsters3d', 'display_name', 'MONSTER 3D 🐋');
  END IF;
  
  IF NEW.ai_bitbots_whale THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095033899492573274', 'name', 'AI BitBots Whale', 'type', 'whale', 'color', '#e1f2a1', 'emoji_url', '/emojis/MEGA BOT 🐋.webp', 'collection', 'ai_bitbots', 'display_name', 'MEGA BOT 🐋');
  END IF;

  -- 3. Main collection holder roles
  IF NEW.fcked_catz_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095033759612547133', 'name', 'FCKed Catz Holder', 'type', 'holder', 'color', '#7e6ff7', 'emoji_url', '/emojis/CAT.webp', 'collection', 'fcked_catz', 'display_name', 'CAT');
  END IF;
  
  IF NEW.money_monsters_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '1093607056696692828', 'name', 'Money Monsters Holder', 'type', 'holder', 'color', '#fc7c7c', 'emoji_url', '/emojis/MONSTER.webp', 'collection', 'money_monsters', 'display_name', 'MONSTER');
  END IF;
  
  IF NEW.ai_bitbots_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095034117877399686', 'name', 'AI BitBots Holder', 'type', 'holder', 'color', '#097e67', 'emoji_url', '/emojis/BITBOT.webp', 'collection', 'ai_bitbots', 'display_name', 'BITBOT');
  END IF;
  
  IF NEW.moneymonsters3d_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '1093607187454111825', 'name', 'Money Monsters 3D Holder', 'type', 'holder', 'color', '#ff0000', 'emoji_url', '/emojis/MONSTER 3D.webp', 'collection', 'moneymonsters3d', 'display_name', 'MONSTER 3D');
  END IF;
  
  IF NEW.celebcatz_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095335098112561234', 'name', 'Celebrity Catz Holder', 'type', 'holder', 'color', '#5dffd8', 'emoji_url', '/emojis/CELEB.webp', 'collection', 'celebcatz', 'display_name', 'CELEB');
  END IF;

  -- Top 10 roles based on collection_counts (part of main collection roles)
  IF top_10_status.money_monsters_top_10 > 0 THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095338675224707103', 'name', 'Money Monsters Top 10', 'type', 'holder', 'color', '#48a350', 'emoji_url', '/emojis/MMTOP10.webp', 'collection', 'money_monsters', 'display_name', 'MM TOP 10');
  END IF;

  IF top_10_status.money_monsters_3d_top_10 > 0 THEN 
    roles_array = roles_array || jsonb_build_object('id', '1095338840178294795', 'name', 'Money Monsters 3D Top 10', 'type', 'holder', 'color', '#6ad1a0', 'emoji_url', '/emojis/MM3DTOP10.webp', 'collection', 'moneymonsters3d', 'display_name', 'MM3D TOP 10');
  END IF;

  -- 4. BUXDAO 5 role
  IF NEW.buxdao_5 THEN 
    roles_array = roles_array || jsonb_build_object('id', '1248428373487784006', 'name', 'BUXDAO 5', 'type', 'special', 'color', '#00be22', 'emoji_url', '/emojis/BUX.webp', 'collection', 'all', 'display_name', 'BUX$DAO 5');
  END IF;

  -- 5. Collaboration collection roles
  IF NEW.shxbb_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '16661', 'name', 'A.I. Warriors Holder', 'type', 'collab', 'color', '#bbbaba', 'emoji_url', '/emojis/globe.svg', 'collection', 'shxbb', 'display_name', 'AI warrior');
  END IF;

  IF NEW.ausqrl_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '16662', 'name', 'A.I. Squirrels Holder', 'type', 'collab', 'color', '#bbbaba', 'emoji_url', '/emojis/globe.svg', 'collection', 'ausqrl', 'display_name', 'AI squirrel');
  END IF;

  IF NEW.aelxaibb_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '16663', 'name', 'A.I. Energy Apes', 'type', 'collab', 'color', '#bbbaba', 'emoji_url', '/emojis/globe.svg', 'collection', 'aelxaibb', 'display_name', 'AI energy ape');
  END IF;

  IF NEW.airb_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '16664', 'name', 'Rejected Bots Holder', 'type', 'collab', 'color', '#bbbaba', 'emoji_url', '/emojis/globe.svg', 'collection', 'airb', 'display_name', 'Rjctd bot');
  END IF;

  IF NEW.clb_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '16665', 'name', 'Candy Bot Holder', 'type', 'collab', 'color', '#bbbaba', 'emoji_url', '/emojis/globe.svg', 'collection', 'clb', 'display_name', 'Candy bot');
  END IF;

  IF NEW.ddbot_holder THEN 
    roles_array = roles_array || jsonb_build_object('id', '16666', 'name', 'Doodle Bot Holder', 'type', 'collab', 'color', '#bbbaba', 'emoji_url', '/emojis/globe.svg', 'collection', 'ddbot', 'display_name', 'Doodle bot');
  END IF;

  NEW.roles = roles_array;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 