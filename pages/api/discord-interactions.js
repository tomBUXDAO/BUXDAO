import { verifyKey } from 'discord-interactions';

// Collection configurations
const COLLECTIONS = {
  'cat': {
    name: 'FCKed Catz',
    symbol: 'FCKEDCATZ',
    hasRarity: true
  },
  'celeb': {
    name: 'Celebrity Catz',
    symbol: 'CelebCatz',
    hasRarity: false
  },
  'mm': {
    name: 'Money Monsters',
    symbol: 'MM',
    hasRarity: true
  },
  'mm3d': {
    name: '3D Money Monsters',
    symbol: 'MM3D',
    hasRarity: true
  },
  'bot': {
    name: 'A.I. BitBots',
    symbol: 'AIBB',
    hasRarity: false
  }
};

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
    // Get raw body as ArrayBuffer first
    const arrayBuffer = await req.arrayBuffer();
    const rawBody = new TextDecoder().decode(arrayBuffer);
    
    console.log('Raw body received:', {
      length: rawBody.length,
      preview: rawBody.slice(0, 100) + '...'
    });

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
      command: interaction.data?.name,
      options: interaction.data?.options
    });

    // Handle ping
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle slash commands
    if (interaction.type === 2) {
      const { name, options } = interaction.data;

      if (name === 'nft') {
        // Get the subcommand (collection) and token ID
        const subcommand = options?.[0];
        if (!subcommand) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: 'Please specify a collection and token ID',
                flags: 64
              }
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        const collection = subcommand.name;
        const tokenId = subcommand.options?.[0]?.value;

        if (!COLLECTIONS[collection]) {
          return new Response(
            JSON.stringify({
              type: 4,
              data: {
                content: 'Invalid collection specified',
                flags: 64
              }
            }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Return immediate acknowledgment
        return new Response(
          JSON.stringify({
            type: 5, // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
            data: {
              flags: 64 // EPHEMERAL
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Handle unknown commands
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: 'Unknown command',
            flags: 64
          }
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle unknown interaction type
    console.warn('Unknown interaction type:', interaction.type);
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: 'Unknown interaction type',
          flags: 64
        }
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
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
} 