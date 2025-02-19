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
  
  try {
    // Get raw body
    const rawBody = await req.text();
    
    // Verify the request
    const isValidRequest = verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      return new Response('Invalid request signature', { status: 401 });
    }

    // Parse the request body
    const interaction = JSON.parse(rawBody);

    // Handle ping (type 1)
    if (interaction.type === 1) {
      return new Response(
        JSON.stringify({ type: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle commands (type 2)
    if (interaction.type === 2) {
      const { name, options } = interaction.data;

      if (name === 'nft') {
        // Send deferred response
        return new Response(
          JSON.stringify({
            type: 5,
            data: {
              flags: 64
            }
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Handle unknown command
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