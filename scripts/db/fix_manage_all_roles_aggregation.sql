-- Batch update all user roles based on aggregated NFT and BUX holdings across all linked wallets
DO $$
DECLARE
    user_record RECORD;
    nft_counts RECORD;
    bux_balance NUMERIC;
BEGIN
    -- Loop through all Discord users
    FOR user_record IN SELECT DISTINCT discord_id FROM user_wallets WHERE discord_id IS NOT NULL LOOP
        -- Aggregate BUX balance across all wallets
        SELECT COALESCE(SUM(balance), 0) INTO bux_balance
        FROM bux_holders
        WHERE wallet_address IN (SELECT wallet_address FROM user_wallets WHERE discord_id = user_record.discord_id);

        -- Aggregate NFT counts by owner_discord_id (not wallet address)
        WITH nft_holdings AS (
            SELECT symbol, COUNT(*) as count
            FROM nft_metadata
            WHERE owner_discord_id = user_record.discord_id
            GROUP BY symbol
        )
        SELECT
            SUM(CASE WHEN symbol = 'FCKEDCATZ' THEN count ELSE 0 END) as fcked_catz_count,
            SUM(CASE WHEN symbol = 'MM' THEN count ELSE 0 END) as money_monsters_count,
            SUM(CASE WHEN symbol = 'MM3D' THEN count ELSE 0 END) as moneymonsters3d_count,
            SUM(CASE WHEN symbol = 'AIBB' THEN count ELSE 0 END) as ai_bitbots_count,
            SUM(CASE WHEN symbol = 'CelebCatz' THEN count ELSE 0 END) as celebcatz_count,
            SUM(CASE WHEN symbol = 'AELxAIBB' THEN count ELSE 0 END) as aelxaibb_count,
            SUM(CASE WHEN symbol = 'AIRB' THEN count ELSE 0 END) as airb_count,
            SUM(CASE WHEN symbol = 'AUSQRL' THEN count ELSE 0 END) as ausqrl_count,
            SUM(CASE WHEN symbol = 'CLB' THEN count ELSE 0 END) as clb_count,
            SUM(CASE WHEN symbol = 'DDBOT' THEN count ELSE 0 END) as ddbot_count,
            SUM(CASE WHEN symbol = 'SHxBB' THEN count ELSE 0 END) as shxbb_count
            INTO nft_counts
        FROM nft_holdings;

        -- Update user_roles table for this Discord user
        UPDATE user_roles SET
            fcked_catz_holder = (COALESCE(nft_counts.fcked_catz_count, 0) > 0),
            money_monsters_holder = (COALESCE(nft_counts.money_monsters_count, 0) > 0),
            moneymonsters3d_holder = (COALESCE(nft_counts.moneymonsters3d_count, 0) > 0),
            ai_bitbots_holder = (COALESCE(nft_counts.ai_bitbots_count, 0) > 0),
            celebcatz_holder = (COALESCE(nft_counts.celebcatz_count, 0) > 0),
            fcked_catz_whale = (COALESCE(nft_counts.fcked_catz_count, 0) >= 25),
            money_monsters_whale = (COALESCE(nft_counts.money_monsters_count, 0) >= 25),
            moneymonsters3d_whale = (COALESCE(nft_counts.moneymonsters3d_count, 0) >= 25),
            ai_bitbots_whale = (COALESCE(nft_counts.ai_bitbots_count, 0) >= 10),
            aelxaibb_holder = (COALESCE(nft_counts.aelxaibb_count, 0) > 0),
            airb_holder = (COALESCE(nft_counts.airb_count, 0) > 0),
            ausqrl_holder = (COALESCE(nft_counts.ausqrl_count, 0) > 0),
            clb_holder = (COALESCE(nft_counts.clb_count, 0) > 0),
            ddbot_holder = (COALESCE(nft_counts.ddbot_count, 0) > 0),
            shxbb_holder = (COALESCE(nft_counts.shxbb_count, 0) > 0),
            bux_beginner = (bux_balance >= 2500 AND bux_balance < 10000),
            bux_builder = (bux_balance >= 10000 AND bux_balance < 25000),
            bux_saver = (bux_balance >= 25000 AND bux_balance < 50000),
            bux_banker = (bux_balance >= 50000),
            -- BUXDAO 5 role: must hold at least 1 of each main collection
            buxdao_5 = (
                COALESCE(nft_counts.fcked_catz_count, 0) > 0 AND
                COALESCE(nft_counts.money_monsters_count, 0) > 0 AND
                COALESCE(nft_counts.moneymonsters3d_count, 0) > 0 AND
                COALESCE(nft_counts.ai_bitbots_count, 0) > 0 AND
                COALESCE(nft_counts.celebcatz_count, 0) > 0
            )
        WHERE discord_id = user_record.discord_id;
    END LOOP;
END $$; 