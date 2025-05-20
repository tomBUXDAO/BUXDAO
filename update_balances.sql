-- Create temporary table with new balances
CREATE TEMP TABLE new_balances (
    discord_name TEXT,
    balance INTEGER
);

-- Insert the new balances
INSERT INTO new_balances (discord_name, balance) VALUES
('Tom [BUX$DAO] 🇬🇧', 60342),
('tonytokens81', 27990),
('Gob1 [BUX$DAO] 🇬🇧', 24662),
('Johnsey [BUX$DAO]', 23875),
('Benno094 [BUX$DAO] 🇦🇺', 20953),
('nolasmokes [BUX$DAO]', 18184),
('machineman710 [BUX$DAO] 🇺🇸', 17758),
('Guava [BUX$DAO]', 13554),
('kingdad [BUX$DAO]', 13470),
('wolly[BUX$DAO]', 12922),
('DrGreen78 {PAZ} | KBD$ | $NOBDY', 11288),
('🥶ミ★ 𝘒𝘢𝘯𝘦 ★彡🥶', 10798),
('Sposato | The Holy Black', 9921),
('Josh [BUX$DAO]', 9431),
('808blockchain', 8761),
('Helipos [BUX$DAO]🇩🇰', 8377),
('CannaSolz420', 6053),
('ZeroTwo02 [BUX$DAO] 🇳🇬', 5859),
('*CɾαȥყLυɳαTιιK* [BUX$DAO] 🇫🇷', 5809),
('Blazooswiss🏴☠🇨🇭', 5197),
('Seeshell 🔻', 4891),
('Friedaw13 [BUX$DAO] 🇺🇸', 4580),
('Tbroker 🔴 W3PC', 4252),
('GeneGuy2023 | BUX$DAO', 4053),
('CryptoRich | Cryptonians Poker', 3769),
('MrSmith83', 3656),
('killerbunny | KBD$', 3652),
('Mr FunGuy', 3650),
('FlandersNedly98 ☁ ⌐◨-◨', 3531),
('shelby013 🐇🐒', 3220),
('themac7150', 3076),
('cken99', 3015),
('SamosTheBullyz [BUX$DAO]', 2590),
('Dublin 17', 2551),
('aWeekLate | FENpromos', 2520),
('Momo Bones', 2447),
('mikeww', 2441),
('Devour', 2436),
('Migue', 2436),
('Lincoln Hawk 1555', 2435),
('Friguy859', 2290),
('Hodler 🇬🇧', 2176),
('Jimmy', 2140),
('Miss Aussie Bunny🇦🇺', 2112),
('Professor | 𝓑𝓮𝓷𝓰𝓪𝓵 𝓣𝓲𝓰𝓮𝓻 🐅', 2025),
('AbdFattahRaja''i', 1998),
('Beardy', 1905),
('osyfoods | Jackasspunk', 1707),
('CitrusNugget', 1472),
('! Aaboom', 1464),
('Olizeki [BUX$DAO] 🇨🇭', 1298),
('Clazik_Emperor [BUX$DAO]', 1287),
('Fuzzems', 1281),
('PirATecombat', 1232),
('Kurian Kei', 1218),
('jimmy_rugpull', 1169),
('Pedro✅', 1043),
('archetype0x', 966),
('The6Beast6In6Me | Saint Degen', 964),
('daisychain', 948),
('PiffsPeak BearishAF', 938);

-- Update claim_accounts with new balances
UPDATE claim_accounts ca
SET unclaimed_amount = nb.balance
FROM new_balances nb
WHERE REPLACE(ca.discord_name, '@', '') = REPLACE(nb.discord_name, '@', '');

-- Clean up
DROP TABLE new_balances; 