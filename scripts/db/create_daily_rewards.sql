-- First, delete any existing entries for today to avoid duplicates
DELETE FROM daily_rewards 
WHERE reward_period_start = CURRENT_DATE;

-- Calculate daily rewards for all users based on their NFT holdings
WITH user_holdings AS (
    SELECT
        ur.discord_id,
        ur.discord_name,
        COALESCE(cc.celeb_catz_count, 0) as celeb_catz_count,
        COALESCE(cc.money_monsters_3d_count, 0) as money_monsters_3d_count,
        COALESCE(cc.fcked_catz_count, 0) as fcked_catz_count,
        COALESCE(cc.money_monsters_count, 0) as money_monsters_count,
        COALESCE(cc.aibitbots_count, 0) as aibitbots_count,
        COALESCE(cc.ai_collabs_count, 0) as ai_collabs_count,
        COALESCE(cc.branded_catz_count, 0) as branded_catz_count,
        COALESCE(cc.money_monsters_top_10, 0) as money_monsters_top_10,
        COALESCE(cc.money_monsters_3d_top_10, 0) as money_monsters_3d_top_10
    FROM user_roles ur
    LEFT JOIN collection_counts cc ON ur.discord_id = cc.discord_id
    WHERE ur.discord_id IS NOT NULL
)
INSERT INTO daily_rewards (
    discord_id,
    discord_name,
    reward_period_start,
    reward_period_end,
    calculation_time,
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
    total_daily_reward,
    is_processed
)
SELECT
    h.discord_id,
    h.discord_name,
    CURRENT_DATE as reward_period_start,
    CURRENT_DATE + INTERVAL '1 day' as reward_period_end,
    CURRENT_TIMESTAMP as calculation_time,
    h.celeb_catz_count,
    h.celeb_catz_count * 20 as celeb_catz_reward, -- 20 BUX per Celeb Catz
    h.money_monsters_3d_count,
    h.money_monsters_3d_count * 7 as money_monsters_3d_reward, -- 7 BUX per MM3D
    h.fcked_catz_count,
    h.fcked_catz_count * 5 as fcked_catz_reward, -- 5 BUX per Fcked Catz
    h.money_monsters_count,
    h.money_monsters_count * 5 as money_monsters_reward, -- 5 BUX per MM
    h.aibitbots_count,
    h.aibitbots_count * 3 as aibitbots_reward, -- 3 BUX per AI BitBots
    h.ai_collabs_count,
    h.ai_collabs_count * 1 as ai_collabs_reward, -- 1 BUX per AI Collab
    h.money_monsters_top_10,
    h.money_monsters_top_10 * 5 as money_monsters_top_10_reward, -- +5 BUX for MM Top 10
    h.money_monsters_3d_top_10,
    h.money_monsters_3d_top_10 * 7 as money_monsters_3d_top_10_reward, -- +7 BUX for MM3D Top 10
    h.branded_catz_count,
    h.branded_catz_count * 5 as branded_catz_reward, -- +5 BUX for Branded Catz
    (
        h.celeb_catz_count +
        h.money_monsters_3d_count +
        h.fcked_catz_count +
        h.money_monsters_count +
        h.aibitbots_count +
        h.ai_collabs_count +
        h.branded_catz_count
    ) as total_nft_count,
    (
        (h.celeb_catz_count * 20) +
        (h.money_monsters_3d_count * 7) +
        (h.fcked_catz_count * 5) +
        (h.money_monsters_count * 5) +
        (h.aibitbots_count * 3) +
        (h.ai_collabs_count * 1) +
        (h.money_monsters_top_10 * 5) +
        (h.money_monsters_3d_top_10 * 7) +
        (h.branded_catz_count * 5)
    ) as total_daily_reward,
    false as is_processed
FROM user_holdings h
WHERE h.discord_id IS NOT NULL;

-- Update claim_accounts with the new daily rewards
UPDATE claim_accounts ca
SET unclaimed_amount = unclaimed_amount + dr.total_daily_reward
FROM daily_rewards dr
WHERE ca.discord_id = dr.discord_id
AND dr.reward_period_start = CURRENT_DATE
AND dr.is_processed = false;

-- Mark rewards as processed
UPDATE daily_rewards
SET is_processed = true
WHERE reward_period_start = CURRENT_DATE
AND is_processed = false; 