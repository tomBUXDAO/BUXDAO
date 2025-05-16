CREATE OR REPLACE FUNCTION public.calculate_initial_daily_rewards()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    collection_counts RECORD;
    total_reward INTEGER := 0;
BEGIN
    -- Get collection counts for the user
    SELECT
        COUNT(CASE WHEN symbol = 'CelebCatz' THEN 1 END) as celeb_catz_count,
        COUNT(CASE WHEN symbol = 'MM3D' THEN 1 END) as money_monsters_3d_count,
        COUNT(CASE WHEN symbol = 'FCKEDCATZ' THEN 1 END) as fcked_catz_count,
        COUNT(CASE WHEN symbol = 'MM' THEN 1 END) as money_monsters_count,
        COUNT(CASE WHEN symbol = 'AIBB' THEN 1 END) as aibitbots_count,
        COUNT(CASE WHEN is_collab = true THEN 1 END) as ai_collabs_count,
        COUNT(*) as total_count
    INTO collection_counts
    FROM nft_metadata
    WHERE owner_wallet = NEW.wallet_address
    AND is_listed = false;

    -- Calculate rewards based on collection counts
    INSERT INTO daily_rewards (
        discord_id,
        calculation_time,
        reward_period_start,
        reward_period_end,
        celeb_catz_count,
        celeb_catz_reward,
        money_monsters_3d_count,
        money_monsters_3d_reward,
        fcked_catz_count,
        fcked_catz_reward,
        money_monsters_count,
        money_monsters_reward,
        aibitbots_count,
        aibitbots_reward,
        ai_collabs_count,
        ai_collabs_reward,
        total_nft_count,
        total_daily_reward,
        is_processed,
        discord_name
    )
    SELECT
        NEW.discord_id,
        CURRENT_TIMESTAMP,
        date_trunc('day', CURRENT_TIMESTAMP),
        date_trunc('day', CURRENT_TIMESTAMP + interval '1 day'),
        collection_counts.celeb_catz_count,
        collection_counts.celeb_catz_count * 20,
        collection_counts.money_monsters_3d_count,
        collection_counts.money_monsters_3d_count * 7,
        collection_counts.fcked_catz_count,
        collection_counts.fcked_catz_count * 5,
        collection_counts.money_monsters_count,
        collection_counts.money_monsters_count * 5,
        collection_counts.aibitbots_count,
        collection_counts.aibitbots_count * 3,
        collection_counts.ai_collabs_count,
        collection_counts.ai_collabs_count * 1,
        collection_counts.total_count,
        (collection_counts.celeb_catz_count * 20) +
        (collection_counts.money_monsters_3d_count * 7) +
        (collection_counts.fcked_catz_count * 5) +
        (collection_counts.money_monsters_count * 5) +
        (collection_counts.aibitbots_count * 3) +
        (collection_counts.ai_collabs_count * 1),
        false,
        (SELECT discord_name FROM user_roles WHERE discord_id = NEW.discord_id)
    ON CONFLICT (discord_id, reward_period_start) DO NOTHING;

    RETURN NEW;
END;
$$; 