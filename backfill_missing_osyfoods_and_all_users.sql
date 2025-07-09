-- 1. Backfill claim_accounts for all users in user_wallets missing from claim_accounts
INSERT INTO claim_accounts (discord_id, unclaimed_amount, total_claimed, last_claim_time)
SELECT uw.discord_id, 0, 0, CURRENT_TIMESTAMP
FROM user_wallets uw
LEFT JOIN claim_accounts ca ON uw.discord_id = ca.discord_id
WHERE ca.discord_id IS NULL
GROUP BY uw.discord_id;

-- 2. Backfill daily_rewards for all users in user_wallets missing from daily_rewards
INSERT INTO daily_rewards (
  discord_id, calculation_time, celeb_catz_count, celeb_catz_reward, money_monsters_3d_count, money_monsters_3d_reward,
  fcked_catz_count, fcked_catz_reward, money_monsters_count, money_monsters_reward,
  aibitbots_count, aibitbots_reward, ai_collabs_count, ai_collabs_reward,
  money_monsters_top_10_count, money_monsters_top_10_reward, money_monsters_3d_top_10_count, money_monsters_3d_top_10_reward,
  branded_catz_count, branded_catz_reward, total_nft_count, total_daily_reward, discord_name
)
SELECT uw.discord_id, CURRENT_TIMESTAMP, 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0, ur.discord_name
FROM user_wallets uw
LEFT JOIN daily_rewards dr ON uw.discord_id = dr.discord_id
LEFT JOIN user_roles ur ON uw.discord_id = ur.discord_id
WHERE dr.discord_id IS NULL
GROUP BY uw.discord_id, ur.discord_name;
