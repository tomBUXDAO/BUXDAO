-- Safely insert/update daily_rewards for all users using collection_counts_aggregated
INSERT INTO daily_rewards (
    discord_id,
    discord_name,
    celeb_catz_reward,
    money_monsters_3d_reward,
    fcked_catz_reward,
    money_monsters_reward,
    aibitbots_reward,
    ai_collabs_reward,
    money_monsters_top_10_reward,
    money_monsters_3d_top_10_reward,
    branded_catz_reward,
    total_daily_reward,
    is_processed
)
SELECT 
    ur.discord_id,
    ur.discord_name,
    COALESCE(cc.celeb_catz_count, 0) * 20,
    COALESCE(cc.money_monsters_3d_count, 0) * 7,
    COALESCE(cc.fcked_catz_count, 0) * 5,
    COALESCE(cc.money_monsters_count, 0) * 5,
    COALESCE(cc.aibitbots_count, 0) * 3,
    COALESCE(cc.ai_collabs_count, 0) * 1,
    COALESCE(cc.money_monsters_top_10, 0) * 5,
    COALESCE(cc.money_monsters_3d_top_10, 0) * 7,
    COALESCE(cc.branded_catz_count, 0) * 5,
    (COALESCE(cc.celeb_catz_count, 0) * 20) +
    (COALESCE(cc.money_monsters_3d_count, 0) * 7) +
    (COALESCE(cc.fcked_catz_count, 0) * 5) +
    (COALESCE(cc.money_monsters_count, 0) * 5) +
    (COALESCE(cc.aibitbots_count, 0) * 3) +
    (COALESCE(cc.ai_collabs_count, 0) * 1) +
    (COALESCE(cc.money_monsters_top_10, 0) * 5) +
    (COALESCE(cc.money_monsters_3d_top_10, 0) * 7) +
    (COALESCE(cc.branded_catz_count, 0) * 5),
    false
FROM user_roles ur
LEFT JOIN collection_counts cc ON ur.discord_id = cc.discord_id
LEFT JOIN daily_rewards dr ON ur.discord_id = dr.discord_id
WHERE ur.discord_id IS NOT NULL 
AND dr.discord_id IS NULL
ON CONFLICT (discord_id) 
DO UPDATE SET
    celeb_catz_reward = EXCLUDED.celeb_catz_reward,
    money_monsters_3d_reward = EXCLUDED.money_monsters_3d_reward,
    fcked_catz_reward = EXCLUDED.fcked_catz_reward,
    money_monsters_reward = EXCLUDED.money_monsters_reward,
    aibitbots_reward = EXCLUDED.aibitbots_reward,
    ai_collabs_reward = EXCLUDED.ai_collabs_reward,
    money_monsters_top_10_reward = EXCLUDED.money_monsters_top_10_reward,
    money_monsters_3d_top_10_reward = EXCLUDED.money_monsters_3d_top_10_reward,
    branded_catz_reward = EXCLUDED.branded_catz_reward,
    total_daily_reward = EXCLUDED.total_daily_reward,
    discord_name = EXCLUDED.discord_name;

-- Now insert missing claim accounts (discord_id only)
INSERT INTO claim_accounts (discord_id, unclaimed_amount, total_claimed, last_claim_time)
SELECT 
    ur.discord_id,
    0, -- Start with 0 unclaimed amount
    0, -- Start with 0 total claimed
    NOW() -- Set last claim time to now
FROM user_roles ur
LEFT JOIN claim_accounts ca ON ur.discord_id = ca.discord_id
WHERE ur.discord_id IS NOT NULL 
AND ca.discord_id IS NULL;
