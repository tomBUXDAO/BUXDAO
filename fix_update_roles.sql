CREATE OR REPLACE FUNCTION public.update_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    bux_balance NUMERIC;
    role_record RECORD;
    nft_count INTEGER;
    current_value BOOLEAN;
    new_value BOOLEAN;
    collection_counts RECORD;
    holder_roles RECORD;
BEGIN
    -- Get BUX balance
    SELECT COALESCE(balance, 0) INTO bux_balance
    FROM bux_holders
    WHERE wallet_address = NEW.wallet_address;

    -- Get collection counts
    SELECT * INTO collection_counts
    FROM collection_counts
    WHERE wallet_address = NEW.wallet_address;

    -- Get holder roles
    SELECT fcked_catz_holder, money_monsters_holder, moneymonsters3d_holder, ai_bitbots_holder, celebcatz_holder
    INTO holder_roles
    FROM user_roles
    WHERE discord_id = NEW.discord_id;

    -- Update BUXDAO5 role based on holder roles
    new_value := (
        holder_roles.fcked_catz_holder AND
        holder_roles.money_monsters_holder AND
        holder_roles.moneymonsters3d_holder AND
        holder_roles.ai_bitbots_holder AND
        holder_roles.celebcatz_holder
    );
    SELECT buxdao_5 INTO current_value
    FROM user_roles
    WHERE discord_id = NEW.discord_id;
    IF current_value IS DISTINCT FROM new_value THEN
        UPDATE user_roles
        SET buxdao_5 = new_value
        WHERE discord_id = NEW.discord_id;
    END IF;

    -- Update Money Monsters Top 10 role
    new_value := (COALESCE(collection_counts.money_monsters_top_10, 0) > 0);
    SELECT money_monsters_top_10 INTO current_value
    FROM user_roles
    WHERE discord_id = NEW.discord_id;
    IF current_value IS DISTINCT FROM new_value THEN
        UPDATE user_roles
        SET money_monsters_top_10 = new_value
        WHERE discord_id = NEW.discord_id;
    END IF;

    -- Update Money Monsters 3D Top 10 role
    new_value := (COALESCE(collection_counts.money_monsters_3d_top_10, 0) > 0);
    SELECT money_monsters_3d_top_10 INTO current_value
    FROM user_roles
    WHERE discord_id = NEW.discord_id;
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
$$; 