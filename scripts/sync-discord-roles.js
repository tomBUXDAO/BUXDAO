import pg from 'pg';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages
  ],
  partials: [
    Partials.User,
    Partials.GuildMember,
    Partials.Message
  ]
});

// Initialize database connection
const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false,
    sslmode: 'require'
  }
});

// Cache for roles data
let rolesCache = null;

// Function to get roles from database
async function getRoles() {
  if (rolesCache) return rolesCache;

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM roles ORDER BY type, collection');
    rolesCache = result.rows;
    return result.rows;
  } finally {
    client.release();
  }
}

// Helper function to check role eligibility
function checkRoleEligibility(userRoles, role) {
  let isEligible = false;
  
  switch (role.type) {
    case 'holder':
      switch (role.collection) {
        case 'fcked_catz':
          isEligible = userRoles.fcked_catz_holder;
          break;
        case 'money_monsters':
          isEligible = userRoles.money_monsters_holder;
          break;
        case 'ai_bitbots':
          isEligible = userRoles.ai_bitbots_holder;
          break;
        case 'moneymonsters3d':
          isEligible = userRoles.moneymonsters3d_holder;
          break;
        case 'celebcatz':
          isEligible = userRoles.celebcatz_holder;
          break;
      }
      break;

    case 'whale':
      switch (role.collection) {
        case 'fcked_catz':
          isEligible = userRoles.fcked_catz_whale;
          break;
        case 'money_monsters':
          isEligible = userRoles.money_monsters_whale;
          break;
        case 'ai_bitbots':
          isEligible = userRoles.ai_bitbots_whale;
          break;
        case 'moneymonsters3d':
          isEligible = userRoles.moneymonsters3d_whale;
          break;
      }
      break;

    case 'token':
      if (role.collection === 'bux') {
        switch (role.name) {
          case 'BUX Beginner':
            isEligible = userRoles.bux_beginner;
            break;
          case 'BUX Builder':
            isEligible = userRoles.bux_builder;
            break;
          case 'BUX Saver':
            isEligible = userRoles.bux_saver;
            break;
          case 'BUX Banker':
            isEligible = userRoles.bux_banker;
            break;
        }
      }
      break;

    case 'special':
      if (role.name === 'BUXDAO 5') {
        isEligible = userRoles.buxdao_5;
      }
      break;

    case 'collab':
      switch (role.collection) {
        case 'shxbb':
          isEligible = userRoles.shxbb_holder;
          break;
        case 'ausqrl':
          isEligible = userRoles.ausqrl_holder;
          break;
        case 'aelxaibb':
          isEligible = userRoles.aelxaibb_holder;
          break;
        case 'airb':
          isEligible = userRoles.airb_holder;
          break;
        case 'clb':
          isEligible = userRoles.clb_holder;
          break;
        case 'ddbot':
          isEligible = userRoles.ddbot_holder;
          break;
      }
      break;

    case 'top10':
      if (role.collection === 'money_monsters') {
        isEligible = userRoles.money_monsters_top_10 > 0;
      } else if (role.collection === 'moneymonsters3d') {
        isEligible = userRoles.money_monsters_3d_top_10 > 0;
      }
      break;
  }

  return isEligible;
}

// Function to sync roles for a single user
async function syncUserRoles(discordId, guildId) {
  console.log(`Syncing roles for user ${discordId}`);
  
  const dbClient = await pool.connect();
  try {
    // Get user's role flags from user_roles
    const userResult = await dbClient.query(
      `SELECT * FROM user_roles WHERE discord_id = $1`,
      [discordId]
    );

    if (userResult.rowCount === 0) {
      console.log(`No user_roles entry found for Discord ID: ${discordId}`);
      return false;
    }

    const userRoles = userResult.rows[0];
    const roles = await getRoles();
    
    // Get Discord guild and member
    const guild = await client.guilds.fetch(guildId);
    let member;
    try {
      member = await guild.members.fetch(discordId);
    } catch (error) {
      console.error(`Member ${discordId} not found in guild`);
      return false;
    }

    // Track role changes
    const rolesToAdd = [];
    const rolesToRemove = [];

    // Get the list of role IDs we manage
    const managedRoleIds = roles.map(r => r.discord_role_id);

    // Check each role
    for (const role of roles) {
      const shouldHaveRole = checkRoleEligibility(userRoles, role);
      const hasRole = member.roles.cache.has(role.discord_role_id);

      if (shouldHaveRole && !hasRole) {
        rolesToAdd.push(role.discord_role_id);
      } else if (!shouldHaveRole && hasRole) {
        // Only remove roles that we manage
        if (managedRoleIds.includes(role.discord_role_id)) {
          rolesToRemove.push(role.discord_role_id);
        }
      }
    }

    // Apply role changes
    if (rolesToAdd.length > 0) {
      try {
        await member.roles.add(rolesToAdd);
        console.log(`Added roles for ${discordId}:`, rolesToAdd);
      } catch (error) {
        console.error('Error adding roles:', error);
      }
    }

    if (rolesToRemove.length > 0) {
      try {
        await member.roles.remove(rolesToRemove);
        console.log(`Removed roles for ${discordId}:`, rolesToRemove);
      } catch (error) {
        console.error('Error removing roles:', error);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error syncing roles for ${discordId}:`, error);
    return false;
  } finally {
    dbClient.release();
  }
}

// Main function to sync all users
async function syncAllUsers() {
  try {
    console.log('Starting role sync for all users...');
    
    // Login to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log('Logged in to Discord');

    const dbClient = await pool.connect();
    try {
      // Get all users with discord_id
      const result = await dbClient.query('SELECT discord_id FROM user_roles WHERE discord_id IS NOT NULL');
      const totalUsers = result.rows.length;
      console.log(`Found ${totalUsers} users to sync`);

      let successCount = 0;
      let failCount = 0;

      // Process users
      for (let i = 0; i < result.rows.length; i++) {
        const { discord_id } = result.rows[i];
        try {
          const success = await syncUserRoles(discord_id, process.env.DISCORD_GUILD_ID);
          if (success) {
            successCount++;
          } else {
            failCount++;
          }

          // Log progress every 10 users
          if ((i + 1) % 10 === 0) {
            console.log(`Progress: ${i + 1}/${totalUsers} users processed`);
            console.log(`Success: ${successCount}, Failed: ${failCount}`);
          }

          // Add delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          failCount++;
          console.error(`Error processing user ${discord_id}:`, error);
        }
      }

      console.log('\nRole sync completed!');
      console.log(`Total users: ${totalUsers}`);
      console.log(`Successful syncs: ${successCount}`);
      console.log(`Failed syncs: ${failCount}`);

    } finally {
      dbClient.release();
    }
  } catch (error) {
    console.error('Error in syncAllUsers:', error);
  } finally {
    // Close Discord client
    client.destroy();
    // Close database pool
    await pool.end();
  }
}

// Run the sync
syncAllUsers().catch(console.error); 