-- Trigger function: create_user_on_wallet_connect()
CREATE OR REPLACE FUNCTION public.create_user_on_wallet_connect() RETURNS trigger AS $$
DECLARE
    wallet_count INTEGER;
BEGIN
    -- Count wallets for this discord_id (including the new one)
    SELECT COUNT(*) INTO wallet_count FROM user_wallets WHERE discord_id = NEW.discord_id;

    -- If this is the first wallet for this discord_id, create per-user entries
    IF wallet_count = 1 THEN
        INSERT INTO user_roles (discord_id, discord_name) VALUES (NEW.discord_id, '') ON CONFLICT DO NOTHING;
        INSERT INTO claim_accounts (wallet_address, discord_id, unclaimed_amount, total_claimed, last_claim_time)
            VALUES (NEW.wallet_address, NEW.discord_id, 0, 0, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
        INSERT INTO daily_rewards (discord_id, calculation_time, reward_period_start, reward_period_end, celeb_catz_count, celeb_catz_reward, money_monsters_3d_count, money_monsters_3d_reward, fcked_catz_count, fcked_catz_reward, money_monsters_count, money_monsters_reward, aibitbots_count, aibitbots_reward, ai_collabs_count, ai_collabs_reward, total_nft_count, total_daily_reward, is_processed, discord_name)
            VALUES (NEW.discord_id, CURRENT_TIMESTAMP, date_trunc('day', CURRENT_TIMESTAMP), date_trunc('day', CURRENT_TIMESTAMP + interval '1 day'), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, false, '')
            ON CONFLICT (discord_id, reward_period_start) DO NOTHING;
    END IF;

    -- Always create collection_counts for this wallet+discord combo if missing
    INSERT INTO collection_counts (wallet_address, discord_id, discord_name, fcked_catz_count, money_monsters_count, aibitbots_count, money_monsters_3d_count, celeb_catz_count, total_count, last_updated, ai_collabs_count, money_monsters_top_10, money_monsters_3d_top_10, branded_catz_count, ai_warriors_count, ai_secret_squirrels_count, ai_energy_apes_count, rejected_bots_ryc_count, candybots_count, doodlebots_count)
        VALUES (NEW.wallet_address, NEW.discord_id, '', 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on user_wallets insert
DROP TRIGGER IF EXISTS trg_create_user_on_wallet_connect ON user_wallets;
CREATE TRIGGER trg_create_user_on_wallet_connect
AFTER INSERT ON user_wallets
FOR EACH ROW
EXECUTE FUNCTION public.create_user_on_wallet_connect();
