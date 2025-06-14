import { pool } from '../../../config/database.js';

/**
 * Handler for the /addclaim admin command
 * @param {Object} options - Command options
 * @param {string} options.discordId - Discord user ID (from tag)
 * @param {string} options.username - Discord username (from tag)
 * @param {number} options.amount - Amount of BUX tokens to award
 * @param {string} options.issuerId - Discord ID of the command issuer
 * @param {Array<string>} options.adminIds - Array of allowed admin Discord IDs
 * @returns {Promise<Object>} Discord embed response
 */
export async function handleAddClaim({ discordId, username, amount, issuerId, adminIds }) {
  // Permission check
  if (!adminIds.includes(issuerId)) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Permission Denied',
          description: 'You do not have permission to use this command.',
          color: 0xFF0000
        }],
        flags: 0 // Public
      }
    };
  }

  // Input validation
  if (!discordId || !username || !amount || isNaN(amount) || amount <= 0) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Invalid Input',
          description: 'Please provide a valid user and positive amount.',
          color: 0xFF0000
        }],
        flags: 0 // Public
      }
    };
  }

  let client;
  try {
    client = await pool.connect();
    // Check if user exists
    const result = await client.query(
      'SELECT unclaimed_amount FROM claim_accounts WHERE discord_id = $1',
      [discordId]
    );
    if (result.rows.length === 0) {
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'Award Failed',
            description: `No claim account found for user **${username}**. Please log in to the site to create an account.`,
            color: 0xFF0000
          }],
          flags: 0 // Public
        }
      };
    }
    // Add amount to unclaimed_amount
    const newAmount = Number(result.rows[0].unclaimed_amount) + Number(amount);
    await client.query(
      'UPDATE claim_accounts SET unclaimed_amount = $1 WHERE discord_id = $2',
      [newAmount, discordId]
    );
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'BUX Tokens Awarded!',
          description: `Successfully added ${amount} BUX to **${username}**'s claim account.`,
          color: 0x4CAF50,
          fields: [
            { name: 'User', value: username, inline: true },
            { name: 'Amount Awarded', value: String(amount), inline: true },
            { name: 'New Unclaimed Balance', value: String(newAmount), inline: true }
          ]
        }],
        flags: 0 // Public
      }
    };
  } catch (error) {
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Database Error',
          description: error.message,
          color: 0xFF0000
        }],
        flags: 0 // Public
      }
    };
  } finally {
    if (client) client.release();
  }
} 