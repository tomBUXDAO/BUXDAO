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
  console.log('[addclaim] Called with:', { discordId, username, amount, issuerId, adminIds });
  // Permission check
  if (!adminIds.includes(issuerId)) {
    console.log('[addclaim] Permission denied for issuer:', issuerId);
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
    console.log('[addclaim] Invalid input:', { discordId, username, amount });
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
    console.log('[addclaim] Connecting to DB...');
    client = await pool.connect();
    console.log('[addclaim] Connected to DB. Checking if user exists...');
    // Check if user exists
    const result = await client.query(
      'SELECT unclaimed_amount, discord_name FROM claim_accounts WHERE discord_id = $1',
      [discordId]
    );
    console.log('[addclaim] Query result:', result.rows);
    if (result.rows.length === 0) {
      console.log('[addclaim] No claim account found for user:', username);
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
    const dbUsername = result.rows[0].discord_name;
    console.log('[addclaim] Updating unclaimed_amount to:', newAmount);
    await client.query(
      'UPDATE claim_accounts SET unclaimed_amount = $1 WHERE discord_id = $2',
      [newAmount, discordId]
    );
    console.log('[addclaim] Update successful. Returning success embed.');

    // Fetch the user's avatar URL from Discord
    let avatarUrl;
    try {
      // You need to implement this utility in your codebase
      const { getUserAvatarUrl } = await import('../../../discord/utils.js');
      avatarUrl = await getUserAvatarUrl(discordId);
    } catch (e) {
      avatarUrl = undefined;
    }

    return {
      type: 4,
      data: {
        embeds: [{
          title: `**${dbUsername} received ${amount} BUX Tokens!**`,
          color: 0x4CAF50,
          fields: [
            { name: 'Amount Awarded', value: `${amount}`, inline: false },
            { name: 'New Unclaimed Balance', value: `${newAmount}`, inline: false }
          ],
          thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
          footer: {
            text: 'BUXDAO - Putting Community First'
          }
        }],
        flags: 0 // Public
      }
    };
  } catch (error) {
    console.log('[addclaim] Database error:', error);
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
    if (client) {
      try {
        await client.release();
        console.log('[addclaim] DB client released.');
      } catch (releaseError) {
        console.log('[addclaim] Error releasing DB client:', releaseError);
      }
    }
  }
} 