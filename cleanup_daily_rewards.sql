-- Delete duplicate entries, keeping only the most recent one for each user per day
DELETE FROM daily_rewards
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY discord_id, reward_period_start 
                   ORDER BY calculation_time DESC
               ) as rn
        FROM daily_rewards
    ) t
    WHERE t.rn > 1
);

-- Verify the cleanup
SELECT reward_period_start, COUNT(*) as entries_per_day 
FROM daily_rewards 
GROUP BY reward_period_start 
ORDER BY reward_period_start; 