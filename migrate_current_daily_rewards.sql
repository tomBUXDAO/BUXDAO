-- 1. Create new table for live daily rewards
CREATE TABLE IF NOT EXISTS current_daily_rewards AS
SELECT DISTINCT ON (discord_id) *
FROM daily_rewards
ORDER BY discord_id, reward_period_start DESC;

-- 2. Add primary key on discord_id
ALTER TABLE current_daily_rewards DROP CONSTRAINT IF EXISTS current_daily_rewards_pkey;
ALTER TABLE current_daily_rewards ADD PRIMARY KEY (discord_id);

-- 3. (Optional) Remove columns not needed for live table
-- You can comment/uncomment these as needed
-- ALTER TABLE current_daily_rewards DROP COLUMN reward_period_start, DROP COLUMN reward_period_end, DROP COLUMN is_processed, DROP COLUMN processed_at;

-- 4. Verify row count matches unique users in daily_rewards
SELECT COUNT(*) AS current_daily_rewards, COUNT(DISTINCT discord_id) AS unique_users FROM current_daily_rewards;
