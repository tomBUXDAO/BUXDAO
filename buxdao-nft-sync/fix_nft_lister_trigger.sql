-- Fix the update_nft_lister_details trigger function
-- The function should join through user_wallets to get discord_id, then to user_roles

CREATE OR REPLACE FUNCTION update_nft_lister_details()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF (TG_OP = 'UPDATE' AND (OLD.original_lister IS NULL OR NEW.original_lister != OLD.original_lister)) THEN
        -- Clear the lister_discord_name first
        UPDATE nft_metadata SET lister_discord_name = NULL WHERE mint_address = NEW.mint_address;
        
        -- If there's a new original_lister, try to get their discord name
        IF NEW.original_lister IS NOT NULL THEN
            UPDATE nft_metadata 
            SET lister_discord_name = ur.discord_name 
            FROM user_wallets uw
            JOIN user_roles ur ON uw.discord_id = ur.discord_id
            WHERE nft_metadata.mint_address = NEW.mint_address 
            AND uw.wallet_address = NEW.original_lister;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$; 