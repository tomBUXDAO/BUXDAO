import { verifyKey } from 'discord-interactions';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Only handle POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Get Discord headers
  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');
  
  // Get raw body
  const body = await req.text();

  // Verify the request
  const isValidRequest = verifyKey(
    body,
    signature,
    timestamp,
    process.env.DISCORD_PUBLIC_KEY
  );

  if (!isValidRequest) {
    return new Response('Invalid request signature', { status: 401 });
  }

  // Parse the request body
  const interaction = JSON.parse(body);

  // Handle ping
  if (interaction.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Handle slash commands
  if (interaction.type === 2) {
    const { name } = interaction.data;

    switch (name) {
      case 'nft':
        // Acknowledge the command immediately
        return new Response(
          JSON.stringify({
            type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              content: 'Looking up NFT information...',
            },
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({
            type: 4,
            data: {
              content: 'Unknown command',
              embeds: [{
                title: 'Error',
                description: 'This command is not recognized',
                color: 0xFF0000,
                timestamp: new Date().toISOString()
              }]
            },
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
    }
  }

  // Handle unknown interaction type
  return new Response(
    JSON.stringify({
      type: 4,
      data: {
        content: 'Unknown interaction type',
      },
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
} 