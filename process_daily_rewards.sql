-- Function to process daily rewards
CREATE OR REPLACE FUNCTION process_daily_rewards()
RETURNS TRIGGER AS $$
BEGIN
    -- Update unclaimed_amount in claim_accounts
    UPDATE claim_accounts ca
    SET unclaimed_amount = ca.unclaimed_amount + dr.total_daily_reward
    FROM daily_rewards dr
    WHERE ca.discord_id = dr.discord_id
    AND dr.is_processed = false
    AND dr.calculation_time <= CURRENT_TIMESTAMP - INTERVAL '24 hours';

    -- Mark the processed rewards
    UPDATE daily_rewards
    SET is_processed = true,
        processed_at = CURRENT_TIMESTAMP
    WHERE is_processed = false
    AND calculation_time <= CURRENT_TIMESTAMP - INTERVAL '24 hours';

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to run every day
CREATE OR REPLACE TRIGGER process_daily_rewards_trigger
    AFTER INSERT OR UPDATE ON daily_rewards
    FOR EACH ROW
    WHEN (NEW.is_processed = false AND NEW.calculation_time <= CURRENT_TIMESTAMP - INTERVAL '24 hours')
    EXECUTE FUNCTION process_daily_rewards();

-- Create a function to manually process pending rewards
CREATE OR REPLACE FUNCTION process_pending_rewards()
RETURNS void AS $$
BEGIN
    -- Process any pending rewards
    UPDATE claim_accounts ca
    SET unclaimed_amount = ca.unclaimed_amount + dr.total_daily_reward
    FROM daily_rewards dr
    WHERE ca.discord_id = dr.discord_id
    AND dr.is_processed = false
    AND dr.calculation_time <= CURRENT_TIMESTAMP - INTERVAL '24 hours';

    -- Mark processed rewards
    UPDATE daily_rewards
    SET is_processed = true,
        processed_at = CURRENT_TIMESTAMP
    WHERE is_processed = false
    AND calculation_time <= CURRENT_TIMESTAMP - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql; 