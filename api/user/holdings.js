import { pool } from '../db';

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
      // Get user's NFT holdings by collection
      const holdingsQuery = `
        SELECT 
          n.collection,
          COUNT(*) as count
        FROM nft_metadata n
        WHERE n.owner_discord_id = $1
        GROUP BY n.collection
      `;
      
      const holdingsResult = await client.query(holdingsQuery, [req.session.user.discord_id]);
      
      // Get user's roles
      const rolesQuery = `
        SELECT r.id, r.name, r.discord_role_id
        FROM roles r
        JOIN user_roles ur ON (
          (r.type = 'holder' AND ur.is_holder = true) OR
          (r.type = 'whale' AND ur.is_whale = true) OR
          (r.type = 'token' AND ur.has_token = true)
        )
        WHERE ur.discord_id = $1
      `;
      
      const rolesResult = await client.query(rolesQuery, [req.session.user.discord_id]);

      // Calculate total NFTs
      const totalCount = holdingsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

      res.json({
        collections: holdingsResult.rows.map(row => ({
          name: row.collection,
          count: parseInt(row.count)
        })),
        roles: rolesResult.rows,
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