-- Replace manage_all_roles to aggregate across all wallets for the Discord user
CREATE OR REPLACE FUNCTION public.manage_all_roles()
RETURNS trigger AS $$
DECLARE
  new_roles jsonb := '[]'::jsonb;
  bux_balance NUMERIC;
  nft_counts RECORD;
  buxdao5_role RECORD;
BEGIN
  RAISE NOTICE 'Starting manage_all_roles (aggregated)';

  -- Get BUX balance across all wallets for this Discord user
  SELECT SUM(balance) INTO bux_balance FROM bux_holders
    WHERE wallet_address IN (SELECT wallet_address FROM user_wallets WHERE discord_id = NEW.discord_id);

  -- Get NFT counts across all wallets for this Discord user
  WITH nft_holdings AS (
    SELECT symbol, COUNT(*) as count
    FROM nft_metadata
    WHERE owner_wallet IN (SELECT wallet_address FROM user_wallets WHERE discord_id = NEW.discord_id)
    GROUP BY symbol
  )
  SELECT
    SUM(CASE WHEN symbol = 'FCKEDCATZ' THEN count ELSE 0 END) as fcked_catz_count,
    SUM(CASE WHEN symbol = 'MM' THEN count ELSE 0 END) as money_monsters_count,
    SUM(CASE WHEN symbol = 'MM3D' THEN count ELSE 0 END) as moneymonsters3d_count,
    SUM(CASE WHEN symbol = 'AIBB' THEN count ELSE 0 END) as ai_bitbots_count,
    SUM(CASE WHEN symbol = 'CelebCatz' THEN count ELSE 0 END) as celebcatz_count
    INTO nft_counts
    FROM nft_holdings;

  -- Assign roles based on aggregated counts
  NEW.fcked_catz_holder := (nft_counts.fcked_catz_count >= 1);
  NEW.money_monsters_holder := (nft_counts.money_monsters_count >= 1);
  NEW.moneymonsters3d_holder := (nft_counts.moneymonsters3d_count >= 1);
  NEW.ai_bitbots_holder := (nft_counts.ai_bitbots_count >= 1);
  NEW.celebcatz_holder := (nft_counts.celebcatz_count >= 1);
  NEW.fcked_catz_whale := (nft_counts.fcked_catz_count >= 25);
  NEW.money_monsters_whale := (nft_counts.money_monsters_count >= 25);
  NEW.moneymonsters3d_whale := (nft_counts.moneymonsters3d_count >= 25);
  NEW.ai_bitbots_whale := (nft_counts.ai_bitbots_count >= 10);
  NEW.bux_beginner := (bux_balance >= 2500 AND bux_balance < 10000);
  NEW.bux_builder := (bux_balance >= 10000 AND bux_balance < 25000);
  NEW.bux_saver := (bux_balance >= 25000 AND bux_balance < 50000);
  NEW.bux_banker := (bux_balance >= 50000);

  -- (Keep the rest of your role JSON logic as in your original function)
  -- ...

  RETURN NEW;
END;
$$ LANGUAGE plpgsql; 