-- Create missing claim accounts for users who don't have them
INSERT INTO claim_accounts (discord_id, wallet_address, unclaimed_amount, total_claimed, last_claim_time)
SELECT 
    ur.discord_id,
    ur.wallet_address,
    0, -- Start with 0 unclaimed amount
    0, -- Start with 0 total claimed
    NOW() -- Set last claim time to now
FROM user_roles ur
LEFT JOIN claim_accounts ca ON ur.discord_id = ca.discord_id
WHERE ur.discord_id IS NOT NULL 
AND ca.discord_id IS NULL
AND ur.wallet_address IS NOT NULL
AND ur.discord_id IN (
    '944883771067494411', -- memnoch666.
    '582611087849947147', -- jimmy_rugpull
    '826889326334967808', -- olukurou.
    '290531269970755587', -- gob.1.
    '890398220600115271', -- .shoeman
    '943631488371544104', -- seeshell
    '734542056390787112', -- professor420k
    '756602719548211410', -- bizton
    '993984242260398081', -- zerotwo02_0202
    '909636049628708934', -- madmatte
    '976330459317415976', -- drgreen78paz
    '844006621164208188', -- tbroker
    '707135836105342996', -- benno094
    '400349825121648641', -- qwasezeb
    '495693115156594721', -- sposato
    '577901812246511637', -- sandralee78
    '906235345878794251'  -- ccyberbunny
)
ON CONFLICT (discord_id) DO NOTHING; 