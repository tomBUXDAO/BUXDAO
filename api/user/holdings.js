import { pool } from '../config/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!req.session?.user?.discord_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const client = await pool.connect();

    try {
      // Get user's aggregated NFT holdings from collection_counts_aggregated
      const countsQuery = `
        SELECT * FROM collection_counts_aggregated WHERE discord_id = $1
      `;
      const countsResult = await client.query(countsQuery, [req.session.user.discord_id]);
      const row = countsResult.rows[0];

      // If no row, return zeros
      if (!row) {
        return res.json({
          collections: [],
          totalCount: 0
        });
      }

      // Map DB columns to frontend collection keys
      const collections = [
        { name: 'Celeb Catz', count: Number(row.celeb_catz_count) || 0 },
        { name: '3D Monsters', count: Number(row.money_monsters_3d_count) || 0 },
        { name: 'Fcked Catz', count: Number(row.fcked_catz_count) || 0 },
        { name: 'Money Monsters', count: Number(row.money_monsters_count) || 0 },
        { name: 'A.I. BitBots', count: Number(row.aibitbots_count) || 0 },
        { name: 'A.I. Collabs', count: Number(row.ai_collabs_count) || 0 }
      ];

      const totalCount = Number(row.total_count) || 0;

      res.json({
        collections,
        totalCount
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user holdings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 