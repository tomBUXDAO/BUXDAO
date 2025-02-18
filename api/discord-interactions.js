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
  
  // Log headers for debugging
  console.log('Discord interaction headers:', {
    signature: signature?.slice(0, 10) + '...',
    timestamp,
    method: req.method,
    contentType: req.headers.get('content-type')
  });

  try {
    // Get raw body
    const rawBody = await req.text();
    console.log('Raw body length:', rawBody.length);

    // Verify the request
    const isValidRequest = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      console.error('Invalid request signature');
      return new Response('Invalid request signature', { status: 401 });
    }

    // Parse the request body
    const interaction = JSON.parse(rawBody);
    console.log('Processing interaction:', {
      type: interaction.type,
      command: interaction.data?.name
    });

    // Handle ping
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle slash commands
    if (interaction.type === 2) {
      const { name } = interaction.data;

      // Immediately acknowledge the command
      const response = {
        type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
        data: {
          content: 'Looking up NFT information...',
          flags: 64 // EPHEMERAL
        }
      };

      return new Response(JSON.stringify(response), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle unknown interaction type
    console.warn('Unknown interaction type:', interaction.type);
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: 'Unknown interaction type',
          flags: 64
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing interaction:', error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: 'An error occurred while processing the command',
          flags: 64
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
} 