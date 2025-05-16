-- First, ensure we have daily rewards entries for today
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
    ur.discord_id,
    CURRENT_TIMESTAMP,
    date_trunc('day', CURRENT_TIMESTAMP),
    date_trunc('day', CURRENT_TIMESTAMP + interval '1 day'),
    COALESCE(cc.celeb_catz_count, 0),
    COALESCE(cc.celeb_catz_count, 0) * 20,
    COALESCE(cc.money_monsters_3d_count, 0),
    COALESCE(cc.money_monsters_3d_count, 0) * 7,
    COALESCE(cc.fcked_catz_count, 0),
    COALESCE(cc.fcked_catz_count, 0) * 5,
    COALESCE(cc.money_monsters_count, 0),
    COALESCE(cc.money_monsters_count, 0) * 5,
    COALESCE(cc.aibitbots_count, 0),
    COALESCE(cc.aibitbots_count, 0) * 3,
    COALESCE(cc.ai_collabs_count, 0),
    COALESCE(cc.ai_collabs_count, 0) * 1,
    COALESCE(cc.total_count, 0),
    (COALESCE(cc.celeb_catz_count, 0) * 20) +
    (COALESCE(cc.money_monsters_3d_count, 0) * 7) +
    (COALESCE(cc.fcked_catz_count, 0) * 5) +
    (COALESCE(cc.money_monsters_count, 0) * 5) +
    (COALESCE(cc.aibitbots_count, 0) * 3) +
    (COALESCE(cc.ai_collabs_count, 0) * 1),
    false,
    ur.discord_name
FROM user_roles ur
LEFT JOIN collection_counts cc ON ur.wallet_address = cc.wallet_address
LEFT JOIN daily_rewards dr ON ur.discord_id = dr.discord_id 
    AND dr.reward_period_start = date_trunc('day', CURRENT_TIMESTAMP)
WHERE ur.discord_id IS NOT NULL 
AND dr.discord_id IS NULL
ON CONFLICT (discord_id, reward_period_start) DO NOTHING;

-- Now insert missing claim accounts
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