-- 1. Add discord_name column if it doesn't exist
ALTER TABLE claim_accounts ADD COLUMN IF NOT EXISTS discord_name VARCHAR(255);

-- 2. Backfill discord_name from user_roles
UPDATE claim_accounts ca
SET discord_name = ur.discord_name
FROM user_roles ur
WHERE ca.discord_id = ur.discord_id; 