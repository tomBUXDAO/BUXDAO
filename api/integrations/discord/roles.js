import { Client, GatewayIntentBits } from 'discord.js';
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

// Cache roles data
let rolesCache = null;
let rolesCacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

let discordClient = null;

// Function to get or initialize Discord client
async function getDiscordClient() {
  if (!discordClient) {
    try {
      discordClient = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMembers
        ]
      });
      await discordClient.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
      console.error('Failed to initialize Discord client:', error);
      return null;
    }
  }
  return discordClient;
}

// Function to get roles from database
async function getRoles() {
  // Check cache first
  const now = Date.now();
  if (rolesCache && rolesCacheTimestamp && (now - rolesCacheTimestamp < CACHE_DURATION)) {
    return rolesCache;
  }

  const client = await pool.connect();
  try {
    const result = await client.query('SELECT * FROM roles ORDER BY type, collection');
    rolesCache = result.rows;
    rolesCacheTimestamp = now;
    return result.rows;
  } finally {
    client.release();
  }
}

// Function to sync user roles
export async function syncUserRoles(discordId, guildId) {
  console.log(`Syncing roles for user ${discordId} in guild ${guildId}`);
  
  const client = await pool.connect();
  try {
    // Get user's role flags from user_roles
    const userResult = await client.query(
      `SELECT * FROM user_roles WHERE discord_id = $1`,
      [discordId]
    );

    if (userResult.rowCount === 0) {
      console.log(`No user_roles entry found for Discord ID: ${discordId}`);
      return false;
    }

    const userRoles = userResult.rows[0];
    const roles = await getRoles();
    
    // Get Discord client
    const discord = await getDiscordClient();
    if (!discord) {
      console.log('Discord client unavailable - skipping role sync');
      return false;
    }
    
    // Get Discord guild and member
    try {
      const guild = await discord.guilds.fetch(guildId);
      const member = await guild.members.fetch(discordId);
      
      if (!member) {
        console.log(`Member ${discordId} not found in guild ${guildId}`);
        return false;
      }

      // Track role changes
      const rolesToAdd = [];
      const rolesToRemove = [];

      // Check each role
      for (const role of roles) {
        const shouldHaveRole = checkRoleEligibility(userRoles, role);
        const hasRole = member.roles.cache.has(role.discord_role_id);

        if (shouldHaveRole && !hasRole) {
          rolesToAdd.push(role.discord_role_id);
        } else if (!shouldHaveRole && hasRole) {
          rolesToRemove.push(role.discord_role_id);
        }
      }

      // Apply role changes
      if (rolesToAdd.length > 0) {
        await member.roles.add(rolesToAdd);
        console.log(`Added roles for ${discordId}:`, rolesToAdd);
      }

      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove);
        console.log(`Removed roles for ${discordId}:`, rolesToRemove);
      }

      return true;
    } catch (error) {
      console.error('Discord API error:', error);
      return false;
    }
  } catch (error) {
    console.error('Error syncing user roles:', error);
    return false;
  } finally {
    client.release();
  }
}

// Helper function to check if user should have a role
function checkRoleEligibility(userRoles, role) {
  switch (role.type) {
    case 'holder':
      switch (role.collection) {
        case 'fcked_catz':
          return userRoles.fcked_catz_holder;
        case 'money_monsters':
          return userRoles.money_monsters_holder;
        case 'ai_bitbots':
          return userRoles.ai_bitbots_holder;
        case 'moneymonsters3d':
          return userRoles.moneymonsters3d_holder;
        case 'celebcatz':
          return userRoles.celebcatz_holder;
      }
      break;

    case 'whale':
      switch (role.collection) {
        case 'fcked_catz':
          return userRoles.fcked_catz_whale;
        case 'money_monsters':
          return userRoles.money_monsters_whale;
        case 'ai_bitbots':
          return userRoles.ai_bitbots_whale;
        case 'moneymonsters3d':
          return userRoles.moneymonsters3d_whale;
      }
      break;

    case 'token':
      switch (role.collection) {
        case 'bux':
          switch (role.name) {
            case 'BUX Beginner':
              return userRoles.bux_beginner;
            case 'BUX Builder':
              return userRoles.bux_builder;
            case 'BUX Saver':
              return userRoles.bux_saver;
            case 'BUX Banker':
              return userRoles.bux_banker;
          }
      }
      break;

    case 'special':
      if (role.name === 'BUXDAO 5') {
        return userRoles.buxdao_5;
      }
      break;
  }

  return false;
} 