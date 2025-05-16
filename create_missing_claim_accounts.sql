-- Temporarily disable the trigger
ALTER TABLE claim_accounts DISABLE TRIGGER ALL;

-- Create claim accounts for all users who don't have them
INSERT INTO claim_accounts (
    discord_id,
    wallet_address,
    unclaimed_amount,
    total_claimed,
    last_claim_time
)
SELECT 
    ur.discord_id,
    ur.wallet_address,
    0, -- Start with 0 unclaimed amount
    0, -- Start with 0 total claimed
    CURRENT_TIMESTAMP -- Set last claim time to now
FROM user_roles ur
LEFT JOIN claim_accounts ca ON ur.discord_id = ca.discord_id
WHERE ca.discord_id IS NULL
AND ur.discord_id IS NOT NULL
AND ur.wallet_address IS NOT NULL
ON CONFLICT (discord_id) DO NOTHING;

-- Re-enable the trigger
ALTER TABLE claim_accounts ENABLE TRIGGER ALL;

-- Verify the results
SELECT 'user_roles' as table_name, COUNT(*) as count FROM user_roles 
UNION ALL 
SELECT 'claim_accounts', COUNT(*) FROM claim_accounts 
ORDER BY table_name; 