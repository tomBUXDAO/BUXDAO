-- Fix collection_counts_aggregated to use user_wallets for aggregation
CREATE OR REPLACE VIEW collection_counts_aggregated AS
SELECT uw.discord_id,
  COALESCE(SUM(cc.celeb_catz_count), 0) AS celeb_catz_count,
  COALESCE(SUM(cc.money_monsters_3d_count), 0) AS money_monsters_3d_count,
  COALESCE(SUM(cc.fcked_catz_count), 0) AS fcked_catz_count,
  COALESCE(SUM(cc.money_monsters_count), 0) AS money_monsters_count,
  COALESCE(SUM(cc.aibitbots_count), 0) AS aibitbots_count,
  COALESCE(SUM(cc.ai_collabs_count), 0) AS ai_collabs_count,
  COALESCE(SUM(cc.ai_warriors_count), 0) AS ai_warriors_count,
  COALESCE(SUM(cc.ai_secret_squirrels_count), 0) AS ai_secret_squirrels_count,
  COALESCE(SUM(cc.ai_energy_apes_count), 0) AS ai_energy_apes_count,
  COALESCE(SUM(cc.rejected_bots_ryc_count), 0) AS rejected_bots_ryc_count,
  COALESCE(SUM(cc.candybots_count), 0) AS candybots_count,
  COALESCE(SUM(cc.doodlebots_count), 0) AS doodlebots_count,
  COALESCE(SUM(cc.money_monsters_top_10), 0) AS money_monsters_top_10,
  COALESCE(SUM(cc.money_monsters_3d_top_10), 0) AS money_monsters_3d_top_10,
  COALESCE(SUM(cc.branded_catz_count), 0) AS branded_catz_count,
  COALESCE(SUM(cc.total_count), 0) AS total_count,
  NOW() AS last_updated
FROM user_wallets uw
LEFT JOIN collection_counts cc ON uw.wallet_address = cc.wallet_address
GROUP BY uw.discord_id; 