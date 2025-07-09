CREATE OR REPLACE FUNCTION public.update_collection_counts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Remove old owner's counts if needed
  IF OLD.owner_discord_id IS NOT NULL THEN
    INSERT INTO collection_counts (
      discord_id, discord_name, fcked_catz_count, money_monsters_count, aibitbots_count, money_monsters_3d_count, celeb_catz_count, ai_collabs_count, total_count, money_monsters_top_10, money_monsters_3d_top_10, branded_catz_count, ai_warriors_count, ai_secret_squirrels_count, ai_energy_apes_count, rejected_bots_ryc_count, candybots_count, doodlebots_count, last_updated
    )
    SELECT
      OLD.owner_discord_id,
      MAX(owner_name),
      COUNT(*) FILTER (WHERE symbol = 'FCKEDCATZ'),
      COUNT(*) FILTER (WHERE symbol = 'MM'),
      COUNT(*) FILTER (WHERE symbol = 'AIBB'),
      COUNT(*) FILTER (WHERE symbol = 'MM3D'),
      COUNT(*) FILTER (WHERE symbol = 'CelebCatz'),
      COUNT(*) FILTER (WHERE is_collab = true),
      COUNT(*),
      COUNT(*) FILTER (WHERE symbol = 'MM' AND rarity_rank <= 10),
      COUNT(*) FILTER (WHERE symbol = 'MM3D' AND rarity_rank <= 10),
      COUNT(*) FILTER (WHERE is_branded_cat = true),
      COUNT(*) FILTER (WHERE symbol = 'SHxBB'),
      COUNT(*) FILTER (WHERE symbol = 'AUSQRL'),
      COUNT(*) FILTER (WHERE symbol = 'AELxAIBB'),
      COUNT(*) FILTER (WHERE symbol = 'AIRB'),
      COUNT(*) FILTER (WHERE symbol = 'CLB'),
      COUNT(*) FILTER (WHERE symbol = 'DDBOT'),
      MAX(last_updated)
    FROM nft_metadata
    WHERE owner_discord_id = OLD.owner_discord_id
    GROUP BY owner_discord_id
    ON CONFLICT (discord_id) DO UPDATE SET
      discord_name = EXCLUDED.discord_name,
      fcked_catz_count = EXCLUDED.fcked_catz_count,
      money_monsters_count = EXCLUDED.money_monsters_count,
      aibitbots_count = EXCLUDED.aibitbots_count,
      money_monsters_3d_count = EXCLUDED.money_monsters_3d_count,
      celeb_catz_count = EXCLUDED.celeb_catz_count,
      ai_collabs_count = EXCLUDED.ai_collabs_count,
      total_count = EXCLUDED.total_count,
      money_monsters_top_10 = EXCLUDED.money_monsters_top_10,
      money_monsters_3d_top_10 = EXCLUDED.money_monsters_3d_top_10,
      branded_catz_count = EXCLUDED.branded_catz_count,
      ai_warriors_count = EXCLUDED.ai_warriors_count,
      ai_secret_squirrels_count = EXCLUDED.ai_secret_squirrels_count,
      ai_energy_apes_count = EXCLUDED.ai_energy_apes_count,
      rejected_bots_ryc_count = EXCLUDED.rejected_bots_ryc_count,
      candybots_count = EXCLUDED.candybots_count,
      doodlebots_count = EXCLUDED.doodlebots_count,
      last_updated = CURRENT_TIMESTAMP;
  END IF;

  -- Add/update new owner's counts
  IF NEW.owner_discord_id IS NOT NULL THEN
    INSERT INTO collection_counts (
      discord_id, discord_name, fcked_catz_count, money_monsters_count, aibitbots_count, money_monsters_3d_count, celeb_catz_count, ai_collabs_count, total_count, money_monsters_top_10, money_monsters_3d_top_10, branded_catz_count, ai_warriors_count, ai_secret_squirrels_count, ai_energy_apes_count, rejected_bots_ryc_count, candybots_count, doodlebots_count, last_updated
    )
    SELECT
      NEW.owner_discord_id,
      MAX(owner_name),
      COUNT(*) FILTER (WHERE symbol = 'FCKEDCATZ'),
      COUNT(*) FILTER (WHERE symbol = 'MM'),
      COUNT(*) FILTER (WHERE symbol = 'AIBB'),
      COUNT(*) FILTER (WHERE symbol = 'MM3D'),
      COUNT(*) FILTER (WHERE symbol = 'CelebCatz'),
      COUNT(*) FILTER (WHERE is_collab = true),
      COUNT(*),
      COUNT(*) FILTER (WHERE symbol = 'MM' AND rarity_rank <= 10),
      COUNT(*) FILTER (WHERE symbol = 'MM3D' AND rarity_rank <= 10),
      COUNT(*) FILTER (WHERE is_branded_cat = true),
      COUNT(*) FILTER (WHERE symbol = 'SHxBB'),
      COUNT(*) FILTER (WHERE symbol = 'AUSQRL'),
      COUNT(*) FILTER (WHERE symbol = 'AELxAIBB'),
      COUNT(*) FILTER (WHERE symbol = 'AIRB'),
      COUNT(*) FILTER (WHERE symbol = 'CLB'),
      COUNT(*) FILTER (WHERE symbol = 'DDBOT'),
      MAX(last_updated)
    FROM nft_metadata
    WHERE owner_discord_id = NEW.owner_discord_id
    GROUP BY owner_discord_id
    ON CONFLICT (discord_id) DO UPDATE SET
      discord_name = EXCLUDED.discord_name,
      fcked_catz_count = EXCLUDED.fcked_catz_count,
      money_monsters_count = EXCLUDED.money_monsters_count,
      aibitbots_count = EXCLUDED.aibitbots_count,
      money_monsters_3d_count = EXCLUDED.money_monsters_3d_count,
      celeb_catz_count = EXCLUDED.celeb_catz_count,
      ai_collabs_count = EXCLUDED.ai_collabs_count,
      total_count = EXCLUDED.total_count,
      money_monsters_top_10 = EXCLUDED.money_monsters_top_10,
      money_monsters_3d_top_10 = EXCLUDED.money_monsters_3d_top_10,
      branded_catz_count = EXCLUDED.branded_catz_count,
      ai_warriors_count = EXCLUDED.ai_warriors_count,
      ai_secret_squirrels_count = EXCLUDED.ai_secret_squirrels_count,
      ai_energy_apes_count = EXCLUDED.ai_energy_apes_count,
      rejected_bots_ryc_count = EXCLUDED.rejected_bots_ryc_count,
      candybots_count = EXCLUDED.candybots_count,
      doodlebots_count = EXCLUDED.doodlebots_count,
      last_updated = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$; 