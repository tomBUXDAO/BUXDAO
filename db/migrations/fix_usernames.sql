-- Begin transaction
BEGIN;

-- Update bux_holders from user_roles
UPDATE bux_holders b
SET owner_discord_id = u.discord_id,
    owner_name = u.discord_name
FROM user_roles u
WHERE b.wallet_address = u.wallet_address
AND (
    b.owner_discord_id != u.discord_id
    OR b.owner_name != u.discord_name
    OR b.owner_discord_id IS NULL
    OR b.owner_name IS NULL
);

-- Update nft_metadata from user_roles
UPDATE nft_metadata n
SET owner_discord_id = u.discord_id,
    owner_name = u.discord_name
FROM user_roles u
WHERE n.owner_wallet = u.wallet_address
AND (
    n.owner_discord_id != u.discord_id
    OR n.owner_name != u.discord_name
    OR n.owner_discord_id IS NULL
    OR n.owner_name IS NULL
);

-- Commit transaction
COMMIT; 