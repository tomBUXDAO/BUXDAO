-- Update all user roles based on current holdings
DO $$
DECLARE
    user_record RECORD;
    bux_balance NUMERIC;
    nft_count INTEGER;
    holder_roles RECORD;
    collection_counts RECORD;
BEGIN
    -- Loop through all users
    FOR user_record IN 
        SELECT DISTINCT discord_id, wallet_address 
        FROM user_roles 
        WHERE discord_id IS NOT NULL
    LOOP
        -- Get BUX balance
        SELECT COALESCE(balance, 0) INTO bux_balance
        FROM bux_holders
        WHERE wallet_address = user_record.wallet_address;

        -- Get collection counts for main collections
        SELECT * INTO collection_counts
        FROM collection_counts
        WHERE wallet_address = user_record.wallet_address;

        -- Update holder roles based on collection counts
        UPDATE user_roles
        SET 
            -- Main collection holder roles
            fcked_catz_holder = (COALESCE(collection_counts.fcked_catz_count, 0) > 0),
            money_monsters_holder = (COALESCE(collection_counts.money_monsters_count, 0) > 0),
            moneymonsters3d_holder = (COALESCE(collection_counts.money_monsters_3d_count, 0) > 0),
            ai_bitbots_holder = (COALESCE(collection_counts.aibitbots_count, 0) > 0),
            celebcatz_holder = (COALESCE(collection_counts.celeb_catz_count, 0) > 0),
            -- Top 10 roles
            money_monsters_top_10 = (COALESCE(collection_counts.money_monsters_top_10, 0) > 0),
            money_monsters_3d_top_10 = (COALESCE(collection_counts.money_monsters_3d_top_10, 0) > 0),
            -- Whale roles
            ai_bitbots_whale = (COALESCE(collection_counts.aibitbots_count, 0) >= 10),
            fcked_catz_whale = (COALESCE(collection_counts.fcked_catz_count, 0) >= 25),
            money_monsters_whale = (COALESCE(collection_counts.money_monsters_count, 0) >= 25),
            moneymonsters3d_whale = (COALESCE(collection_counts.money_monsters_3d_count, 0) >= 25)
        WHERE discord_id = user_record.discord_id;

        -- Update collab roles based on nft_metadata
        -- A.I. Energy Apes
        SELECT COUNT(*) INTO nft_count
        FROM nft_metadata
        WHERE owner_wallet = user_record.wallet_address
        AND symbol = 'AELxAIBB';
        UPDATE user_roles
        SET aelxaibb_holder = (nft_count > 0)
        WHERE discord_id = user_record.discord_id;

        -- Rejected Bots
        SELECT COUNT(*) INTO nft_count
        FROM nft_metadata
        WHERE owner_wallet = user_record.wallet_address
        AND symbol = 'AIRB';
        UPDATE user_roles
        SET airb_holder = (nft_count > 0)
        WHERE discord_id = user_record.discord_id;

        -- A.I. Squirrels
        SELECT COUNT(*) INTO nft_count
        FROM nft_metadata
        WHERE owner_wallet = user_record.wallet_address
        AND symbol = 'AUSQRL';
        UPDATE user_roles
        SET ausqrl_holder = (nft_count > 0)
        WHERE discord_id = user_record.discord_id;

        -- Candy Bot
        SELECT COUNT(*) INTO nft_count
        FROM nft_metadata
        WHERE owner_wallet = user_record.wallet_address
        AND symbol = 'CLB';
        UPDATE user_roles
        SET clb_holder = (nft_count > 0)
        WHERE discord_id = user_record.discord_id;

        -- Doodle Bot
        SELECT COUNT(*) INTO nft_count
        FROM nft_metadata
        WHERE owner_wallet = user_record.wallet_address
        AND symbol = 'DDBOT';
        UPDATE user_roles
        SET ddbot_holder = (nft_count > 0)
        WHERE discord_id = user_record.discord_id;

        -- A.I. Warriors
        SELECT COUNT(*) INTO nft_count
        FROM nft_metadata
        WHERE owner_wallet = user_record.wallet_address
        AND symbol = 'SHxBB';
        UPDATE user_roles
        SET shxbb_holder = (nft_count > 0)
        WHERE discord_id = user_record.discord_id;

        -- Update BUXDAO5 role based on holder roles
        UPDATE user_roles
        SET buxdao_5 = (
            fcked_catz_holder AND
            money_monsters_holder AND
            moneymonsters3d_holder AND
            ai_bitbots_holder AND
            celebcatz_holder
        )
        WHERE discord_id = user_record.discord_id;

        -- Update BUX token roles
        UPDATE user_roles
        SET 
            bux_banker = (bux_balance >= 50000),
            bux_builder = (bux_balance >= 10000),
            bux_saver = (bux_balance >= 25000),
            bux_beginner = (bux_balance >= 2500)
        WHERE discord_id = user_record.discord_id;

    END LOOP;
END $$; 