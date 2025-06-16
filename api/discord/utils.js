import { Client, GatewayIntentBits, Partials } from 'discord.js';

let discordClient = null;

async function getDiscordClient() {
  if (!discordClient) {
    discordClient = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
      partials: [Partials.User, Partials.GuildMember]
    });
    await discordClient.login(process.env.DISCORD_BOT_TOKEN);
  }
  return discordClient;
}

/**
 * Fetch a user's Discord avatar URL by their Discord ID.
 * @param {string} discordId - The user's Discord ID.
 * @returns {Promise<string|undefined>} The avatar URL, or undefined if not found.
 */
export async function getUserAvatarUrl(discordId) {
  try {
    const client = await getDiscordClient();
    const user = await client.users.fetch(discordId);
    return user.displayAvatarURL({ dynamic: true, size: 256 });
  } catch (e) {
    console.error('[getUserAvatarUrl] Failed to fetch avatar for', discordId, e);
    return undefined;
  }
} 