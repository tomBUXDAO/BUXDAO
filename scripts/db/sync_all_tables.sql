-- First, ensure all users in user_roles have entries in collection_counts
INSERT INTO collection_counts (
    wallet_address,
    discord_id,
    discord_name,
    fcked_catz_count,
    money_monsters_count,
    aibitbots_count,
    money_monsters_3d_count,
    celeb_catz_count,
    total_count,
    ai_collabs_count,
    money_monsters_top_10,
    money_monsters_3d_top_10,
    branded_catz_count
)
SELECT 
    ur.wallet_address,
    ur.discord_id,
    ur.discord_name,
    0, -- fcked_catz_count
    0, -- money_monsters_count
    0, -- aibitbots_count
    0, -- money_monsters_3d_count
    0, -- celeb_catz_count
    0, -- total_count
    0, -- ai_collabs_count
    0, -- money_monsters_top_10
    0, -- money_monsters_3d_top_10
    0  -- branded_catz_count
FROM user_roles ur
LEFT JOIN collection_counts cc ON ur.wallet_address = cc.wallet_address
WHERE cc.wallet_address IS NULL
AND ur.wallet_address IS NOT NULL
ON CONFLICT (wallet_address) DO NOTHING;

-- Ensure all users have entries in bux_holders
INSERT INTO bux_holders (
    wallet_address,
    balance,
    owner_discord_id,
    owner_name,
    last_updated
)
SELECT 
    ur.wallet_address,
    0, -- balance
    ur.discord_id,
    ur.discord_name,
    CURRENT_TIMESTAMP
FROM user_roles ur
LEFT JOIN bux_holders bh ON ur.wallet_address = bh.wallet_address
WHERE bh.wallet_address IS NULL
AND ur.wallet_address IS NOT NULL
ON CONFLICT (wallet_address) DO NOTHING;

-- Ensure all users have entries in claim_accounts
INSERT INTO claim_accounts (
    discord_id,
    wallet_address,
    unclaimed_amount,
    total_claimed,
    last_claim_time
)
SELECT 
    ur.discord_id,
    ur.wallet_address,
    0, -- unclaimed_amount
    0, -- total_claimed
    CURRENT_TIMESTAMP
FROM user_roles ur
LEFT JOIN claim_accounts ca ON ur.discord_id = ca.discord_id
WHERE ca.discord_id IS NULL
AND ur.discord_id IS NOT NULL
ON CONFLICT (discord_id) DO NOTHING;

-- Ensure all users have entries in daily_rewards for today
INSERT INTO daily_rewards (
    discord_id,
    discord_name,
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
    ur.discord_id,
    ur.discord_name,
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
    COALESCE(cc.money_monsters_top_10, 0),
    COALESCE(cc.money_monsters_top_10, 0) * 5,
    COALESCE(cc.money_monsters_3d_top_10, 0),
    COALESCE(cc.money_monsters_3d_top_10, 0) * 7,
    COALESCE(cc.branded_catz_count, 0),
    COALESCE(cc.branded_catz_count, 0) * 5,
    COALESCE(cc.total_count, 0),
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
LEFT JOIN collection_counts cc ON ur.wallet_address = cc.wallet_address
LEFT JOIN daily_rewards dr ON ur.discord_id = dr.discord_id 
    AND dr.reward_period_start = date_trunc('day', CURRENT_TIMESTAMP)
WHERE dr.discord_id IS NULL
AND ur.discord_id IS NOT NULL
ON CONFLICT (discord_id, reward_period_start) DO NOTHING;

-- Verify the counts after sync
SELECT 'user_roles' as table_name, COUNT(*) as count FROM user_roles 
UNION ALL 
SELECT 'collection_counts', COUNT(*) FROM collection_counts 
UNION ALL 
SELECT 'daily_rewards', COUNT(*) FROM daily_rewards 
UNION ALL 
SELECT 'claim_accounts', COUNT(*) FROM claim_accounts 
UNION ALL 
SELECT 'bux_holders', COUNT(*) FROM bux_holders 
ORDER BY table_name; 