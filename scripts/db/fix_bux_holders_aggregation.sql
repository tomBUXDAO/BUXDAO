-- Fix bux_holders_aggregated to use user_wallets for aggregation
CREATE OR REPLACE VIEW bux_holders_aggregated AS
SELECT uw.discord_id,
  COALESCE(SUM(bh.balance), 0) AS total_balance,
  COUNT(bh.wallet_address) AS wallet_count,
  NOW() AS last_updated
FROM user_wallets uw
LEFT JOIN bux_holders bh ON uw.wallet_address = bh.wallet_address
GROUP BY uw.discord_id; 