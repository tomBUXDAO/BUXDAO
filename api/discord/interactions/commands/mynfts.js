import { pool } from '../../../config/database.js';

/**
 * Handler for the /mynfts command
 * @param {Object} options - Command options
 * @param {string} options.targetDiscordId - Discord user ID to view for
 * @param {string} options.targetUsername - Discord username to display
 * @param {string} options.issuerId - Discord ID of the command issuer
 * @param {Array<string>} options.adminIds - Array of allowed admin Discord IDs
 * @returns {Promise<Object>} Discord embed response
 */
export async function handleMyNFTs({ targetDiscordId, targetUsername, issuerId, adminIds }) {
  // Permission check
  if (targetDiscordId !== issuerId && !adminIds.includes(issuerId)) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Permission Denied',
          description: 'You can only view your own NFT holdings. Admins can view any user.',
          color: 0xFF0000
        }],
        flags: 0
      }
    };
  }
  let client;
  try {
    client = await pool.connect();
    // Get user's NFT holdings from collection_counts
    const query = `
      SELECT 
        COALESCE(celeb_catz_count, 0) as celebcatz_count,
        COALESCE(money_monsters_3d_count, 0) as mm3d_count,
        COALESCE(fcked_catz_count, 0) as fckedcatz_count,
        COALESCE(money_monsters_count, 0) as mm_count,
        COALESCE(aibitbots_count, 0) as aibb_count,
        COALESCE(ai_collabs_count, 0) as ai_collabs_count,
        COALESCE(money_monsters_top_10, 0) as money_monsters_top_10,
        COALESCE(money_monsters_3d_top_10, 0) as money_monsters_3d_top_10,
        COALESCE(branded_catz_count, 0) as branded_catz_count,
        COALESCE(total_count, 0) as total_count
      FROM collection_counts 
      WHERE discord_id = $1
    `;
    const result = await client.query(query, [targetDiscordId]);
    const row = result.rows[0];
    if (!row) {
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'No NFTs Found',
            description: `No NFT holdings found for **${targetUsername}**.`,
            color: 0xFF0000
          }],
          flags: 0
        }
      };
    }
    // Format collection counts
    const fields = [
      { name: 'Celeb Catz', value: row.celebcatz_count.toString(), inline: true },
      { name: '3D Monsters', value: row.mm3d_count.toString(), inline: true },
      { name: 'Fcked Catz', value: row.fckedcatz_count.toString(), inline: true },
      { name: 'Money Monsters', value: row.mm_count.toString(), inline: true },
      { name: 'A.I. BitBots', value: row.aibb_count.toString(), inline: true },
      { name: 'A.I. Collabs', value: row.ai_collabs_count.toString(), inline: true },
      { name: 'Branded Catz', value: row.branded_catz_count.toString(), inline: true },
      { name: 'Top 10 MM', value: row.money_monsters_top_10.toString(), inline: true },
      { name: 'Top 10 MM3D', value: row.money_monsters_3d_top_10.toString(), inline: true },
      { name: 'Total', value: row.total_count.toString(), inline: false }
    ];
    return {
      type: 4,
      data: {
        embeds: [{
          title: `NFT Holdings - ${targetUsername}`,
          color: 0x4CAF50,
          fields,
          footer: { text: 'BUXDAO - Putting Community First' },
          timestamp: new Date().toISOString()
        }],
        flags: 0
      }
    };
  } catch (error) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Database Error',
          description: 'An error occurred while fetching NFT holdings.',
          color: 0xFF0000
        }],
        flags: 0
      }
    };
  } finally {
    if (client) client.release();
  }
} 