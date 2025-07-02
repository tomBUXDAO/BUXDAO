DROP FUNCTION IF EXISTS update_roles() CASCADE;

CREATE OR REPLACE FUNCTION update_roles() RETURNS TRIGGER AS $$
DECLARE
    bux_balance NUMERIC;
    role_record RECORD;
    nft_count INTEGER;
    current_value BOOLEAN;
    new_value BOOLEAN;
    collection_counts RECORD;
BEGIN
    -- Get BUX balance
    SELECT COALESCE(balance, 0) INTO bux_balance 
    FROM bux_holders 
    WHERE wallet_address = NEW.wallet_address;

    -- Get collection counts
    SELECT * INTO collection_counts
    FROM collection_counts 
    WHERE wallet_address = NEW.wallet_address;

    -- Update BUXDAO5 role
    new_value := (
        COALESCE(collection_counts.fcked_catz_count, 0) > 0 AND
        COALESCE(collection_counts.money_monsters_count, 0) > 0 AND
        COALESCE(collection_counts.aibitbots_count, 0) > 0 AND
        COALESCE(collection_counts.money_monsters_3d_count, 0) > 0 AND
        COALESCE(collection_counts.celeb_catz_count, 0) > 0
    );

    -- Get current BUXDAO5 value
    SELECT buxdao_5 INTO current_value
    FROM user_roles 
    WHERE discord_id = NEW.discord_id;

    -- Only update if value changed
    IF current_value IS DISTINCT FROM new_value THEN
        UPDATE user_roles 
        SET buxdao_5 = new_value 
        WHERE discord_id = NEW.discord_id;
    END IF;

    -- Update Money Monsters Top 10 role
    new_value := (COALESCE(collection_counts.money_monsters_top_10, 0) > 0);
    
    -- Get current Money Monsters Top 10 value
    SELECT money_monsters_top_10 INTO current_value
    FROM user_roles 
    WHERE discord_id = NEW.discord_id;

    -- Only update if value changed
    IF current_value IS DISTINCT FROM new_value THEN
        UPDATE user_roles 
        SET money_monsters_top_10 = new_value 
        WHERE discord_id = NEW.discord_id;
    END IF;

    -- Update Money Monsters 3D Top 10 role
    new_value := (COALESCE(collection_counts.money_monsters_3d_top_10, 0) > 0);
    
    -- Get current Money Monsters 3D Top 10 value
    SELECT money_monsters_3d_top_10 INTO current_value
    FROM user_roles 
    WHERE discord_id = NEW.discord_id;

    -- Only update if value changed
    IF current_value IS DISTINCT FROM new_value THEN
        UPDATE user_roles 
        SET money_monsters_3d_top_10 = new_value 
        WHERE discord_id = NEW.discord_id;
    END IF;

    -- Loop through roles
    FOR role_record IN SELECT * FROM roles LOOP
        -- For holder and collab roles
        IF role_record.type IN ('holder', 'collab') THEN
            -- Get NFT count
            SELECT COUNT(*) INTO nft_count 
            FROM nft_metadata 
            WHERE owner_wallet = NEW.wallet_address 
            AND LOWER(symbol) = role_record.collection;

            -- Determine new value
            new_value := (nft_count >= role_record.threshold);

            -- Get current value
            EXECUTE format('SELECT %I FROM user_roles WHERE discord_id = $1', role_record.collection || '_holder')
            INTO current_value
            USING NEW.discord_id;

            -- Only update if value changed
            IF current_value IS DISTINCT FROM new_value THEN
                EXECUTE format('UPDATE user_roles SET %I = $1 WHERE discord_id = $2', role_record.collection || '_holder')
                USING new_value, NEW.discord_id;
            END IF;
        END IF;

        -- For BUX roles
        IF role_record.type = 'bux' THEN
            -- Determine new value
            new_value := (bux_balance >= role_record.threshold);

            -- Get current value
            EXECUTE format('SELECT %I FROM user_roles WHERE discord_id = $1', 'bux_' || role_record.name)
            INTO current_value
            USING NEW.discord_id;

            -- Only update if value changed
            IF current_value IS DISTINCT FROM new_value THEN
                EXECUTE format('UPDATE user_roles SET %I = $1 WHERE discord_id = $2', 'bux_' || role_record.name)
                USING new_value, NEW.discord_id;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_roles_trigger ON user_roles;

CREATE TRIGGER update_roles_trigger
    AFTER UPDATE OF last_updated ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_roles(); 