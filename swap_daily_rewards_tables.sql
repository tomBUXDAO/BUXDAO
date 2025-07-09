-- 1. Rename old daily_rewards to daily_rewards_history
ALTER TABLE daily_rewards RENAME TO daily_rewards_history;

-- 2. Rename current_daily_rewards to daily_rewards
ALTER TABLE current_daily_rewards RENAME TO daily_rewards;

-- 3. (Optional) Remove columns not needed for live table
-- Uncomment if you want to drop these columns:
-- ALTER TABLE daily_rewards DROP COLUMN reward_period_start, DROP COLUMN reward_period_end, DROP COLUMN is_processed, DROP COLUMN processed_at;

-- 4. Show new daily_rewards structure
\d+ daily_rewards
