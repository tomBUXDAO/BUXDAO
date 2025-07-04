-- Replace manage_all_roles to aggregate across all wallets for the Discord user
CREATE OR REPLACE FUNCTION public.manage_all_roles()
RETURNS trigger AS $$
DECLARE
  bux_balance NUMERIC := 0;
  fcked_catz_count INT := 0;
  money_monsters_count INT := 0;
  moneymonsters3d_count INT := 0;
  ai_bitbots_count INT := 0;
  celebcatz_count INT := 0;
BEGIN
  RAISE NOTICE 'Starting manage_all_roles (aggregated)';

  -- Get BUX balance across all wallets for this Discord user
  SELECT COALESCE(SUM(balance),0) INTO bux_balance FROM bux_holders
    WHERE wallet_address IN (SELECT wallet_address FROM user_wallets WHERE discord_id = NEW.discord_id);

  -- Get NFT counts across all wallets for this Discord user
  WITH nft_holdings AS (
    SELECT symbol, COUNT(*) as count
    FROM nft_metadata
    WHERE owner_wallet IN (SELECT wallet_address FROM user_wallets WHERE discord_id = NEW.discord_id)
    GROUP BY symbol
  )
  SELECT
    COALESCE(SUM(CASE WHEN symbol = 'FCKEDCATZ' THEN count ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN symbol = 'MM' THEN count ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN symbol = 'MM3D' THEN count ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN symbol = 'AIBB' THEN count ELSE 0 END),0),
    COALESCE(SUM(CASE WHEN symbol = 'CelebCatz' THEN count ELSE 0 END),0)
    INTO fcked_catz_count, money_monsters_count, moneymonsters3d_count, ai_bitbots_count, celebcatz_count
    FROM nft_holdings;

  -- Assign roles based on aggregated counts
  NEW.fcked_catz_holder := (fcked_catz_count >= 1);
  NEW.money_monsters_holder := (money_monsters_count >= 1);
  NEW.moneymonsters3d_holder := (moneymonsters3d_count >= 1);
  NEW.ai_bitbots_holder := (ai_bitbots_count >= 1);
  NEW.celebcatz_holder := (celebcatz_count >= 1);
  NEW.fcked_catz_whale := (fcked_catz_count >= 25);
  NEW.money_monsters_whale := (money_monsters_count >= 25);
  NEW.moneymonsters3d_whale := (moneymonsters3d_count >= 25);
  NEW.ai_bitbots_whale := (ai_bitbots_count >= 10);
  NEW.bux_beginner := (bux_balance >= 2500 AND bux_balance < 10000);
  NEW.bux_builder := (bux_balance >= 10000 AND bux_balance < 25000);
  NEW.bux_saver := (bux_balance >= 25000 AND bux_balance < 50000);
  NEW.bux_banker := (bux_balance >= 50000);

  -- Ensure all role columns are set to TRUE or FALSE (never NULL)
  NEW.fcked_catz_holder := COALESCE(NEW.fcked_catz_holder, FALSE);
  NEW.money_monsters_holder := COALESCE(NEW.money_monsters_holder, FALSE);
  NEW.moneymonsters3d_holder := COALESCE(NEW.moneymonsters3d_holder, FALSE);
  NEW.ai_bitbots_holder := COALESCE(NEW.ai_bitbots_holder, FALSE);
  NEW.celebcatz_holder := COALESCE(NEW.celebcatz_holder, FALSE);
  NEW.fcked_catz_whale := COALESCE(NEW.fcked_catz_whale, FALSE);
  NEW.money_monsters_whale := COALESCE(NEW.money_monsters_whale, FALSE);
  NEW.moneymonsters3d_whale := COALESCE(NEW.moneymonsters3d_whale, FALSE);
  NEW.ai_bitbots_whale := COALESCE(NEW.ai_bitbots_whale, FALSE);
  NEW.bux_beginner := COALESCE(NEW.bux_beginner, FALSE);
  NEW.bux_builder := COALESCE(NEW.bux_builder, FALSE);
  NEW.bux_saver := COALESCE(NEW.bux_saver, FALSE);
  NEW.bux_banker := COALESCE(NEW.bux_banker, FALSE);
  NEW.buxdao_5 := COALESCE(NEW.buxdao_5, FALSE);
  NEW.shxbb_holder := COALESCE(NEW.shxbb_holder, FALSE);
  NEW.ausqrl_holder := COALESCE(NEW.ausqrl_holder, FALSE);
  NEW.aelxaibb_holder := COALESCE(NEW.aelxaibb_holder, FALSE);
  NEW.airb_holder := COALESCE(NEW.airb_holder, FALSE);
  NEW.clb_holder := COALESCE(NEW.clb_holder, FALSE);
  NEW.ddbot_holder := COALESCE(NEW.ddbot_holder, FALSE);
  NEW.money_monsters_top_10 := COALESCE(NEW.money_monsters_top_10, FALSE);
  NEW.money_monsters_3d_top_10 := COALESCE(NEW.money_monsters_3d_top_10, FALSE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 