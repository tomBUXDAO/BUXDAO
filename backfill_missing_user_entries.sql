-- Backfill missing entries for all users in user_wallets

-- 1. user_roles
INSERT INTO user_roles (discord_id, discord_name)
SELECT DISTINCT uw.discord_id, ''
FROM user_wallets uw
LEFT JOIN user_roles ur ON uw.discord_id = ur.discord_id
WHERE ur.discord_id IS NULL;

-- 2. claim_accounts (one per user, using their first wallet)
INSERT INTO claim_accounts (wallet_address, discord_id, unclaimed_amount, total_claimed, last_claim_time)
SELECT DISTINCT ON (uw.discord_id) uw.wallet_address, uw.discord_id, 0, 0, CURRENT_TIMESTAMP
FROM user_wallets uw
LEFT JOIN claim_accounts ca ON uw.discord_id = ca.discord_id
WHERE ca.discord_id IS NULL;

-- 3. daily_rewards (for today, one per user)
INSERT INTO daily_rewards (
  discord_id, calculation_time, reward_period_start, reward_period_end,
  celeb_catz_count, celeb_catz_reward, money_monsters_3d_count, money_monsters_3d_reward,
  fcked_catz_count, fcked_catz_reward, money_monsters_count, money_monsters_reward,
  aibitbots_count, aibitbots_reward, ai_collabs_count, ai_collabs_reward,
  total_nft_count, total_daily_reward, is_processed, discord_name
)
SELECT uw.discord_id, CURRENT_TIMESTAMP, date_trunc('day', CURRENT_TIMESTAMP), date_trunc('day', CURRENT_TIMESTAMP + interval '1 day'),
  0,0,0,0,0,0,0,0,0,0,0,0,0,0,false,''
FROM user_wallets uw
LEFT JOIN daily_rewards dr ON uw.discord_id = dr.discord_id AND dr.reward_period_start = date_trunc('day', CURRENT_TIMESTAMP)
WHERE dr.discord_id IS NULL;

-- 4. collection_counts (one per wallet+discord combo)
INSERT INTO collection_counts (
  wallet_address, discord_id, discord_name, fcked_catz_count, money_monsters_count, aibitbots_count, money_monsters_3d_count, celeb_catz_count, total_count, last_updated, ai_collabs_count, money_monsters_top_10, money_monsters_3d_top_10, branded_catz_count, ai_warriors_count, ai_secret_squirrels_count, ai_energy_apes_count, rejected_bots_ryc_count, candybots_count, doodlebots_count
)
SELECT uw.wallet_address, uw.discord_id, '', 0,0,0,0,0,0, CURRENT_TIMESTAMP, 0,0,0,0,0,0,0,0,0,0
FROM user_wallets uw
LEFT JOIN collection_counts cc ON uw.wallet_address = cc.wallet_address AND uw.discord_id = cc.discord_id
WHERE cc.wallet_address IS NULL;
