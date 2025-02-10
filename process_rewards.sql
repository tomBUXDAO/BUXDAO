-- Function to process daily rewards
CREATE OR REPLACE FUNCTION process_daily_rewards()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if it's the daily reset time (midnight UTC)
    IF date_trunc('day', CURRENT_TIMESTAMP) = date_trunc('day', NEW.calculation_time) 
    AND EXTRACT(HOUR FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC') = 0
    AND EXTRACT(MINUTE FROM CURRENT_TIMESTAMP AT TIME ZONE 'UTC') < 5 THEN
        -- Update unclaimed_amount in claim_accounts
        UPDATE claim_accounts ca
        SET unclaimed_amount = ca.unclaimed_amount + dr.total_daily_reward
        FROM daily_rewards dr
        WHERE ca.discord_id = dr.discord_id
        AND dr.is_processed = false
        AND dr.calculation_time >= date_trunc('day', CURRENT_TIMESTAMP - interval '1 day')
        AND dr.calculation_time < date_trunc('day', CURRENT_TIMESTAMP);

        -- Mark the processed rewards
        UPDATE daily_rewards
        SET is_processed = true,
            processed_at = CURRENT_TIMESTAMP
        WHERE is_processed = false
        AND calculation_time >= date_trunc('day', CURRENT_TIMESTAMP - interval '1 day')
        AND calculation_time < date_trunc('day', CURRENT_TIMESTAMP);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run on daily_rewards updates
CREATE OR REPLACE TRIGGER process_daily_rewards_trigger
    AFTER INSERT OR UPDATE ON daily_rewards
    FOR EACH ROW
    EXECUTE FUNCTION process_daily_rewards();

-- Function to manually process pending rewards for a specific day
CREATE OR REPLACE FUNCTION process_pending_rewards()
RETURNS void AS $$
BEGIN
    -- Process rewards for the previous day only
    UPDATE claim_accounts ca
    SET unclaimed_amount = ca.unclaimed_amount + dr.total_daily_reward
    FROM daily_rewards dr
    WHERE ca.discord_id = dr.discord_id
    AND dr.is_processed = false
    AND dr.calculation_time >= date_trunc('day', CURRENT_TIMESTAMP - interval '1 day')
    AND dr.calculation_time < date_trunc('day', CURRENT_TIMESTAMP);

    -- Mark processed rewards
    UPDATE daily_rewards
    SET is_processed = true,
        processed_at = CURRENT_TIMESTAMP
    WHERE is_processed = false
    AND calculation_time >= date_trunc('day', CURRENT_TIMESTAMP - interval '1 day')
    AND calculation_time < date_trunc('day', CURRENT_TIMESTAMP);
END;
$$ LANGUAGE plpgsql; 