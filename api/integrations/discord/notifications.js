import { Client, Intents } from 'discord.js';

let discordClient = null;

// Function to get or initialize Discord client
async function getDiscordClient() {
  if (discordClient) return discordClient;

  discordClient = new Client({
    intents: [
      Intents.FLAGS.GUILDS,
      Intents.FLAGS.GUILD_MESSAGES,
      Intents.FLAGS.GUILD_MEMBERS,
      Intents.FLAGS.GUILD_PRESENCES
    ]
  });

  discordClient.on('ready', () => {
    console.log('Discord client ready');
  });

  discordClient.on('error', (error) => {
    console.error('Discord client error:', error);
  });

  try {
    await discordClient.login(process.env.DISCORD_BOT_TOKEN);
    console.log('Discord client logged in successfully');
    return discordClient;
  } catch (error) {
    console.error('Discord client login error:', error);
    discordClient = null;
    throw error;
  }
}

// Function to send activity notification
async function sendActivityNotification(message) {
  try {
    const client = await getDiscordClient();
    const channelId = process.env.DISCORD_ACTIVITY_CHANNEL_ID;
    if (!channelId) {
      throw new Error('DISCORD_ACTIVITY_CHANNEL_ID environment variable not set');
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Could not find channel with ID ${channelId}`);
    }

    await channel.send(message);
    return true;
  } catch (error) {
    console.error('Error sending activity notification:', error);
    return false;
  }
}

// Function to send message to any channel
async function sendChannelMessage(channelId, message) {
  try {
    const client = await getDiscordClient();
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      throw new Error(`Could not find channel with ID ${channelId}`);
    }

    await channel.send(message);
    return true;
  } catch (error) {
    console.error('Error sending channel message:', error);
    return false;
  }
}

export {
  getDiscordClient,
  sendActivityNotification,
  sendChannelMessage
}; 