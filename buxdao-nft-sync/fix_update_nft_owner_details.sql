CREATE OR REPLACE FUNCTION public.update_nft_owner_details()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Only proceed if owner_wallet has changed
    IF (TG_OP = 'UPDATE' AND
        (OLD.owner_wallet IS NULL OR NEW.owner_wallet != OLD.owner_wallet)) THEN

        -- First, set discord details to null
        UPDATE nft_metadata
        SET
            owner_discord_id = NULL,
            owner_name = NULL
        WHERE mint_address = NEW.mint_address;

        -- Then, if new owner exists, update with their details
        -- Join through user_wallets to get discord_id, then to user_roles
        IF NEW.owner_wallet IS NOT NULL THEN
            UPDATE nft_metadata
            SET
                owner_discord_id = ur.discord_id,
                owner_name = ur.discord_name
            FROM user_wallets uw
            JOIN user_roles ur ON uw.discord_id = ur.discord_id
            WHERE nft_metadata.mint_address = NEW.mint_address
            AND uw.wallet_address = NEW.owner_wallet;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$; 