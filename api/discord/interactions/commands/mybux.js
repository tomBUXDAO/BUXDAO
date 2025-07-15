import { pool } from '../../../config/database.js';
import { getSolPrice } from '../../../utils/solPrice.js';

/**
 * Handler for the /mybux command
 * @param {Object} options - Command options
 * @param {string} options.targetDiscordId - Discord user ID to view for
 * @param {string} options.targetUsername - Discord username to display
 * @param {string} options.issuerId - Discord ID of the command issuer
 * @param {Array<string>} options.adminIds - Array of allowed admin Discord IDs
 * @returns {Promise<Object>} Discord embed response
 */
export async function handleMyBux({ targetDiscordId, targetUsername, issuerId, adminIds }) {
  // Permission check
  if (targetDiscordId !== issuerId && !adminIds.includes(issuerId)) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Permission Denied',
          description: 'You can only view your own BUX balance. Admins can view any user.',
          color: 0xFF0000
        }],
        flags: 0
      }
    };
  }

  let client;
  try {
    client = await pool.connect();
    // Get user's BUX balance and unclaimed rewards
    const query = `
      SELECT 
        COALESCE(SUM(bh.balance), 0) as balance,
        ca.unclaimed_amount
      FROM claim_accounts ca
      LEFT JOIN bux_holders bh ON bh.owner_discord_id = ca.discord_id
      WHERE ca.discord_id = $1
      GROUP BY ca.discord_id, ca.unclaimed_amount
    `;
    const result = await client.query(query, [targetDiscordId]);
    if (!result.rows[0]) {
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'No Account',
            description: `No BUX account found for **${targetUsername}**.`,
            color: 0xFF0000
          }],
          flags: 0
        }
      };
    }
    const buxBalance = parseInt(result.rows[0].balance) || 0;
    const unclaimed = parseInt(result.rows[0].unclaimed_amount) || 0;
    const totalBux = buxBalance + unclaimed;
    // Fetch SOL price
    const solPrice = await getSolPrice();
    // 1 BUX = 0.01 SOL (example, adjust as needed)
    const buxToSol = 0.01;
    const solValue = totalBux * buxToSol;
    const usdValue = solValue * solPrice;
    return {
      type: 4,
      data: {
        embeds: [{
          title: `BUX Balance - ${targetUsername}`,
          color: 0x4CAF50,
          fields: [
            { name: 'BUX Balance', value: `${buxBalance.toLocaleString()} BUX`, inline: true },
            { name: 'Unclaimed', value: `${unclaimed.toLocaleString()} BUX`, inline: true },
            { name: 'Total', value: `${totalBux.toLocaleString()} BUX`, inline: true },
            { name: 'Cashout Value', value: `${solValue.toFixed(2)} SOL ($${usdValue.toFixed(2)})`, inline: false }
          ],
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
          description: 'An error occurred while fetching BUX balance.',
          color: 0xFF0000
        }],
        flags: 0
      }
    };
  } finally {
    if (client) client.release();
  }
} 