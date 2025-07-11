import { pool } from '../../../config/database.js';

/**
 * Handler for the /profile command
 * @param {Object} options - Command options
 * @param {string} options.targetDiscordId - Discord user ID to view profile for
 * @param {string} options.targetUsername - Discord username to display
 * @param {string} options.issuerId - Discord ID of the command issuer
 * @param {Array<string>} options.adminIds - Array of allowed admin Discord IDs
 * @returns {Promise<Object>} Discord embed response
 */
export async function handleProfile({ targetDiscordId, targetUsername, issuerId, adminIds }) {
  console.log('[profile] Called with:', { targetDiscordId, targetUsername, issuerId, adminIds });

  // Permission check - users can only view their own profile unless they're admin
  if (targetDiscordId !== issuerId && !adminIds.includes(issuerId)) {
    console.log('[profile] Permission denied for issuer:', issuerId);
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Permission Denied',
          description: 'You can only view your own profile. Admins can view any user\'s profile.',
          color: 0xFF0000
        }],
        flags: 0 // Public
      }
    };
  }

  let client;
  try {
    console.log('[profile] Connecting to DB...');
    client = await pool.connect();
    console.log('[profile] Connected to DB. Fetching user data...');

    // Get user's connected wallets
    const walletsResult = await client.query(
      'SELECT wallet_address FROM user_wallets WHERE discord_id = $1 ORDER BY connected_at ASC',
      [targetDiscordId]
    );

    // Get unclaimed balance and username
    const claimResult = await client.query(
      'SELECT unclaimed_amount, discord_name FROM claim_accounts WHERE discord_id = $1',
      [targetDiscordId]
    );

    // Get daily reward yield from daily_rewards entry (1 entry per user now)
    const dailyRewardResult = await client.query(
      'SELECT total_daily_reward FROM daily_rewards WHERE discord_id = $1',
      [targetDiscordId]
    );

    // If no daily_rewards entry, calculate from collection_counts
    let dailyYield = 0;
    if (dailyRewardResult.rows.length > 0) {
      dailyYield = dailyRewardResult.rows[0].total_daily_reward;
    } else {
      const collectionResult = await client.query(
        `SELECT 
          COALESCE(celeb_catz_count, 0) * 20 +
          COALESCE(money_monsters_3d_count, 0) * 7 +
          COALESCE(fcked_catz_count, 0) * 5 +
          COALESCE(money_monsters_count, 0) * 5 +
          COALESCE(aibitbots_count, 0) * 3 +
          COALESCE(ai_collabs_count, 0) * 1 +
          COALESCE(money_monsters_top_10, 0) * 5 +
          COALESCE(money_monsters_3d_top_10, 0) * 7 +
          COALESCE(branded_catz_count, 0) * 5 as daily_yield
        FROM collection_counts WHERE discord_id = $1`,
        [targetDiscordId]
      );
      
      if (collectionResult.rows.length > 0) {
        dailyYield = collectionResult.rows[0].daily_yield;
      }
    }

    // Check if user exists
    if (claimResult.rows.length === 0) {
      console.log('[profile] No claim account found for user:', targetUsername);
      return {
        type: 4,
        data: {
          embeds: [{
            title: 'Profile Not Found',
            description: `No profile found for **${targetUsername}**. Please log in to the site to create an account.`,
            color: 0xFF0000
          }],
          flags: 0 // Public
        }
      };
    }

    const unclaimedAmount = Number(claimResult.rows[0].unclaimed_amount) || 0;
    const dbUsername = claimResult.rows[0].discord_name || targetUsername;
    const wallets = walletsResult.rows.map(row => row.wallet_address);

    // Format wallet addresses for display (truncate long addresses)
    const formattedWallets = wallets.map(wallet => {
      if (wallet.length > 12) {
        return `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 6)}`;
      }
      return wallet;
    });

    // Fetch the user's avatar URL from Discord
    let avatarUrl;
    try {
      const { getUserAvatarUrl } = await import('../../../discord/utils.js');
      avatarUrl = await getUserAvatarUrl(targetDiscordId);
    } catch (e) {
      avatarUrl = undefined;
    }

    // Create wallet display text
    let walletText = 'No wallets connected';
    if (wallets.length > 0) {
      walletText = formattedWallets.join('\n');
      if (wallets.length > 3) {
        walletText = formattedWallets.slice(0, 3).join('\n') + `\n... and ${wallets.length - 3} more`;
      }
    }

    console.log('[profile] Profile data retrieved successfully. Returning embed.');

    return {
      type: 4,
      data: {
        embeds: [{
          title: `BUXDAO Profile - ${dbUsername}`,
          color: 0x4CAF50,
          fields: [
            {
              name: '💰 Unclaimed Balance',
              value: `${unclaimedAmount.toLocaleString()} BUX`,
              inline: true
            },
            {
              name: '🎁 Daily Reward Yield',
              value: `${dailyYield.toLocaleString()} BUX/day`,
              inline: true
            },
            {
              name: '🔗 Connected Wallets',
              value: walletText,
              inline: false
            }
          ],
          thumbnail: avatarUrl ? { url: avatarUrl } : undefined,
          footer: {
            text: 'BUXDAO - Putting Community First'
          },
          timestamp: new Date().toISOString()
        }],
        flags: 0 // Public
      }
    };

  } catch (error) {
    console.log('[profile] Database error:', error);
    return {
      type: 4,
      data: {
        embeds: [{
          title: 'Database Error',
          description: 'An error occurred while fetching profile data. Please try again later.',
          color: 0xFF0000
        }],
        flags: 0 // Public
      }
    };
  } finally {
    if (client) {
      try {
        await client.release();
        console.log('[profile] DB client released.');
      } catch (releaseError) {
        console.log('[profile] Error releasing DB client:', releaseError);
      }
    }
  }
} 