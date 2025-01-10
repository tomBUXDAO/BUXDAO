CREATE OR REPLACE FUNCTION update_roles()
RETURNS TRIGGER AS $$
DECLARE
    bux_balance NUMERIC;
    nft_counts RECORD;
BEGIN
    -- Get BUX balance
    SELECT balance INTO bux_balance
    FROM bux_holders
    WHERE wallet_address = NEW.wallet_address;

    -- Get NFT counts for all collections
    WITH nft_holdings AS (
        SELECT symbol, COUNT(*) as count
        FROM nft_metadata
        WHERE owner_wallet = NEW.wallet_address
        GROUP BY symbol
    )
    SELECT 
        SUM(CASE WHEN symbol = 'FCKEDCATZ' THEN count ELSE 0 END) as fcked_catz_count,
        SUM(CASE WHEN symbol = 'MM' THEN count ELSE 0 END) as money_monsters_count,
        SUM(CASE WHEN symbol = 'MM3D' THEN count ELSE 0 END) as moneymonsters3d_count,
        SUM(CASE WHEN symbol = 'AIBB' THEN count ELSE 0 END) as ai_bitbots_count,
        SUM(CASE WHEN symbol = 'CelebCatz' THEN count ELSE 0 END) as celebcatz_count
    INTO nft_counts
    FROM nft_holdings;

    -- Update holder roles
    WITH updated_roles AS (
        UPDATE user_roles SET
            fcked_catz_holder = (nft_counts.fcked_catz_count >= 1),
            money_monsters_holder = (nft_counts.money_monsters_count >= 1),
            moneymonsters3d_holder = (nft_counts.moneymonsters3d_count >= 1),
            ai_bitbots_holder = (nft_counts.ai_bitbots_count >= 1),
            celebcatz_holder = (nft_counts.celebcatz_count >= 1),
            -- Whale roles
            fcked_catz_whale = (nft_counts.fcked_catz_count >= 25),
            money_monsters_whale = (nft_counts.money_monsters_count >= 25),
            moneymonsters3d_whale = (nft_counts.moneymonsters3d_count >= 25),
            ai_bitbots_whale = (nft_counts.ai_bitbots_count >= 10),
            -- BUX roles
            bux_beginner = (bux_balance >= 2500 AND bux_balance < 10000),
            bux_builder = (bux_balance >= 10000 AND bux_balance < 25000),
            bux_saver = (bux_balance >= 25000 AND bux_balance < 50000),
            bux_banker = (bux_balance >= 50000)
        WHERE discord_id = NEW.discord_id
        RETURNING *
    )
    UPDATE user_roles SET
        buxdao_5 = (
            SELECT 
                fcked_catz_holder AND 
                money_monsters_holder AND 
                moneymonsters3d_holder AND 
                ai_bitbots_holder AND 
                celebcatz_holder 
            FROM updated_roles
        )
    WHERE discord_id = NEW.discord_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql; 