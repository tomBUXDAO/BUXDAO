-- Function to update ownership in nft_metadata and bux_holders
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

-- Function to update roles based on holdings
CREATE OR REPLACE FUNCTION update_roles()
RETURNS TRIGGER AS $$
DECLARE
    bux_balance NUMERIC;
    role_record RECORD;
    nft_count INTEGER;
BEGIN
    -- Get BUX balance
    SELECT balance INTO bux_balance
    FROM bux_holders
    WHERE wallet_address = NEW.wallet_address;

    -- Loop through each role in the roles table
    FOR role_record IN SELECT * FROM roles LOOP
        -- Handle NFT holder roles
        IF role_record.type = 'holder' THEN
            -- Count NFTs for this collection
            SELECT COUNT(*) INTO nft_count
            FROM nft_metadata
            WHERE owner_wallet = NEW.wallet_address
            AND LOWER(symbol) = role_record.collection;

            -- Update role if threshold is met
            IF nft_count >= role_record.threshold THEN
                EXECUTE format('UPDATE user_roles SET %I = true WHERE discord_id = $1', 
                    role_record.collection || '_holder')
                USING NEW.discord_id;
            ELSE
                EXECUTE format('UPDATE user_roles SET %I = false WHERE discord_id = $1', 
                    role_record.collection || '_holder')
                USING NEW.discord_id;
            END IF;
        END IF;

        -- Handle BUX roles
        IF role_record.type = 'bux' THEN
            IF bux_balance >= role_record.threshold THEN
                EXECUTE format('UPDATE user_roles SET %I = true WHERE discord_id = $1', 
                    'bux_' || role_record.name)
                USING NEW.discord_id;
            ELSE
                EXECUTE format('UPDATE user_roles SET %I = false WHERE discord_id = $1', 
                    'bux_' || role_record.name)
                USING NEW.discord_id;
            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a function to notify role changes
CREATE OR REPLACE FUNCTION notify_role_changes() RETURNS trigger AS $$
BEGIN
  -- Only notify if roles array has changed
  IF OLD.roles IS DISTINCT FROM NEW.roles THEN
    -- Call the sync endpoint
    PERFORM pg_notify('role_changes', json_build_object(
      'discord_id', NEW.discord_id,
      'event', 'role_update'
    )::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_ownership_trigger ON user_roles;
DROP TRIGGER IF EXISTS update_roles_trigger ON user_roles;
DROP TRIGGER IF EXISTS notify_role_changes_trigger ON user_roles;

-- Create triggers
CREATE TRIGGER update_ownership_trigger
AFTER INSERT OR UPDATE OF wallet_address ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_ownership();

CREATE TRIGGER update_roles_trigger
AFTER INSERT OR UPDATE OF wallet_address ON user_roles
FOR EACH ROW
EXECUTE FUNCTION update_roles();

CREATE TRIGGER notify_role_changes_trigger
AFTER UPDATE OF roles ON user_roles
FOR EACH ROW
EXECUTE FUNCTION notify_role_changes(); 