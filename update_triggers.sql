-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS update_ownership_trigger ON user_roles;
DROP TRIGGER IF EXISTS update_roles_trigger ON user_roles;
DROP FUNCTION IF EXISTS update_ownership();
DROP FUNCTION IF EXISTS update_roles();

-- Create update_ownership function
CREATE OR REPLACE FUNCTION update_ownership()
RETURNS TRIGGER AS $$
BEGIN
    -- Update NFT ownership
    UPDATE nft_metadata 
    SET owner_discord_id = NEW.discord_id,
        owner_name = NEW.discord_name
    WHERE owner_wallet = NEW.wallet_address;

    -- Update BUX ownership
    UPDATE bux_holders 
    SET owner_discord_id = NEW.discord_id,
        owner_name = NEW.discord_name
    WHERE wallet_address = NEW.wallet_address;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update_ownership trigger
CREATE TRIGGER update_ownership_trigger
AFTER INSERT OR UPDATE OF wallet_address, discord_name
ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_ownership();

-- Create update_roles function
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

    -- Get NFT counts
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

    -- Update roles
    UPDATE user_roles SET
        fcked_catz_holder = (nft_counts.fcked_catz_count >= 1),
        money_monsters_holder = (nft_counts.money_monsters_count >= 1),
        moneymonsters3d_holder = (nft_counts.moneymonsters3d_count >= 1),
        ai_bitbots_holder = (nft_counts.ai_bitbots_count >= 1),
        celebcatz_holder = (nft_counts.celebcatz_count >= 1),
        fcked_catz_whale = (nft_counts.fcked_catz_count >= 25),
        money_monsters_whale = (nft_counts.money_monsters_count >= 25),
        moneymonsters3d_whale = (nft_counts.moneymonsters3d_count >= 25),
        ai_bitbots_whale = (nft_counts.ai_bitbots_count >= 10),
        bux_beginner = (bux_balance >= 2500 AND bux_balance < 10000),
        bux_builder = (bux_balance >= 10000 AND bux_balance < 25000),
        bux_saver = (bux_balance >= 25000 AND bux_balance < 50000),
        bux_banker = (bux_balance >= 50000)
    WHERE discord_id = NEW.discord_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update_roles trigger
CREATE TRIGGER update_roles_trigger
AFTER INSERT OR UPDATE OF wallet_address
ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_roles(); 