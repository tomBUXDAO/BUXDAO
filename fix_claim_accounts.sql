-- First, modify the update_ownership function to include claim account creation
CREATE OR REPLACE FUNCTION public.update_ownership()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update NFT ownership
    UPDATE nft_metadata
    SET owner_discord_id = NEW.discord_id,
        owner_name = NEW.discord_name
    WHERE owner_wallet = NEW.wallet_address;

    -- Update BUX ownership
    UPDATE bux_holders
    SET owner_discord_id = NEW.discord_id,
        owner_name = NEW.discord_name
    WHERE wallet_address = NEW.wallet_address;

    -- Create claim account if it doesn't exist
    INSERT INTO claim_accounts (discord_id, wallet_address, unclaimed_amount, total_claimed, last_claim_time)
    SELECT 
        NEW.discord_id,
        NEW.wallet_address,
        0, -- Start with 0 unclaimed amount
        0, -- Start with 0 total claimed
        NOW() -- Set last claim time to now
    WHERE NEW.discord_id IS NOT NULL 
    AND NEW.wallet_address IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM claim_accounts 
        WHERE discord_id = NEW.discord_id
    )
    ON CONFLICT (discord_id) DO NOTHING;

    -- Update daily rewards for this user
    WITH user_holdings AS (
        SELECT
            NEW.discord_id as discord_id,
            NEW.discord_name as discord_name,
            cc.celeb_catz_count,
            cc.money_monsters_3d_count,
            cc.fcked_catz_count,
            cc.money_monsters_count,
            cc.aibitbots_count,
            cc.ai_collabs_count,
            cc.branded_catz_count,
            cc.money_monsters_top_10,
            cc.money_monsters_3d_top_10
        FROM collection_counts cc
        WHERE cc.discord_id = NEW.discord_id
    )
    INSERT INTO daily_rewards (
        discord_id,
        discord_name,
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
        money_monsters_top_10_count,
        money_monsters_top_10_reward,
        money_monsters_3d_top_10_count,
        money_monsters_3d_top_10_reward,
        branded_catz_count,
        branded_catz_reward,
        total_nft_count,
        total_daily_reward
    )
    SELECT
        h.discord_id,
        h.discord_name,
        date_trunc('day', NOW()),
        date_trunc('day', NOW()) + interval '1 day',
        h.celeb_catz_count,
        h.celeb_catz_count * 20,
        h.money_monsters_3d_count,
        h.money_monsters_3d_count * 7,
        h.fcked_catz_count,
        h.fcked_catz_count * 5,
        h.money_monsters_count,
        h.money_monsters_count * 5,
        h.aibitbots_count,
        h.aibitbots_count * 3,
        h.ai_collabs_count,
        h.ai_collabs_count * 1,
        h.money_monsters_top_10,
        h.money_monsters_top_10 * 5,
        h.money_monsters_3d_top_10,
        h.money_monsters_3d_top_10 * 7,
        h.branded_catz_count,
        h.branded_catz_count * 5,
        (h.celeb_catz_count + h.money_monsters_3d_count + h.fcked_catz_count +
         h.money_monsters_count + h.aibitbots_count + h.ai_collabs_count +
         h.branded_catz_count + h.money_monsters_top_10 + h.money_monsters_3d_top_10),
        (h.celeb_catz_count * 20 + h.money_monsters_3d_count * 7 + h.fcked_catz_count * 5 +
         h.money_monsters_count * 5 + h.aibitbots_count * 3 + h.ai_collabs_count * 1 +
         h.branded_catz_count * 5 + h.money_monsters_top_10 * 5 + h.money_monsters_3d_top_10 * 7)
    FROM user_holdings h
    ON CONFLICT (discord_id, reward_period_start) DO UPDATE SET
        discord_name = EXCLUDED.discord_name,
        celeb_catz_count = EXCLUDED.celeb_catz_count,
        celeb_catz_reward = EXCLUDED.celeb_catz_reward,
        money_monsters_3d_count = EXCLUDED.money_monsters_3d_count,
        money_monsters_3d_reward = EXCLUDED.money_monsters_3d_reward,
        fcked_catz_count = EXCLUDED.fcked_catz_count,
        fcked_catz_reward = EXCLUDED.fcked_catz_reward,
        money_monsters_count = EXCLUDED.money_monsters_count,
        money_monsters_reward = EXCLUDED.money_monsters_reward,
        aibitbots_count = EXCLUDED.aibitbots_count,
        aibitbots_reward = EXCLUDED.aibitbots_reward,
        ai_collabs_count = EXCLUDED.ai_collabs_count,
        ai_collabs_reward = EXCLUDED.ai_collabs_reward,
        money_monsters_top_10_count = EXCLUDED.money_monsters_top_10_count,
        money_monsters_top_10_reward = EXCLUDED.money_monsters_top_10_reward,
        money_monsters_3d_top_10_count = EXCLUDED.money_monsters_3d_top_10_count,
        money_monsters_3d_top_10_reward = EXCLUDED.money_monsters_3d_top_10_reward,
        branded_catz_count = EXCLUDED.branded_catz_count,
        branded_catz_reward = EXCLUDED.branded_catz_reward,
        total_nft_count = EXCLUDED.total_nft_count,
        total_daily_reward = EXCLUDED.total_daily_reward,
        calculation_time = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;

-- Now create missing claim accounts for existing users
INSERT INTO claim_accounts (discord_id, wallet_address, unclaimed_amount, total_claimed, last_claim_time)
SELECT 
    ur.discord_id,
    ur.wallet_address,
    0, -- Start with 0 unclaimed amount
    0, -- Start with 0 total claimed
    NOW() -- Set last claim time to now
FROM user_roles ur
LEFT JOIN claim_accounts ca ON ur.discord_id = ca.discord_id
WHERE ur.discord_id IS NOT NULL 
AND ca.discord_id IS NULL
AND ur.wallet_address IS NOT NULL
ON CONFLICT (discord_id) DO NOTHING; 