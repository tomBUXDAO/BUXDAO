import { verifyKey } from 'discord-interactions';

export const config = {
  runtime: 'edge',
  regions: ['iad1']  // Use Virginia for lowest latency to Discord
};

// Collection configurations
const COLLECTIONS = {
  'cat': {
    name: 'Fcked Cat',
    symbol: 'FCKEDCATZ',
    hasRarity: true,
    logo: '/logos/cat.PNG',
    color: 0xFFF44D // Yellow
  },
  'celeb': {
    name: 'Celebrity Catz',
    symbol: 'CelebCatz',
    hasRarity: false,
    logo: '/logos/celeb.PNG',
    color: 0xFF4D4D // Red
  },
  'mm': {
    name: 'Money Monsters',
    symbol: 'MM',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFFFF // Cyan
  },
  'mm3d': {
    name: 'Money Monsters 3D',
    symbol: 'MM3D',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFF4D // Green
  },
  'bot': {
    name: 'AI Bitbot',
    symbol: 'AIBB',
    hasRarity: false,
    logo: '/logos/bot.PNG',
    color: 0xFF4DFF // Pink
  }
};

export default async function handler(request) {
  try {
    // 1. Verify required headers are present
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    if (!signature || !timestamp) {
      console.error('Missing required Discord headers:', { 
        hasSignature: !!signature, 
        hasTimestamp: !!timestamp
      });
      return new Response('Invalid request signature', { status: 401 });
    }

    // 2. Get the raw body as a string
    const rawBody = await request.text();
    if (!rawBody) {
      console.error('Empty request body');
      return new Response('Invalid request', { status: 401 });
    }

    // 3. Verify the request is from Discord using Ed25519
    if (!process.env.DISCORD_PUBLIC_KEY) {
      console.error('DISCORD_PUBLIC_KEY not configured');
      return new Response('Configuration error', { status: 500 });
    }

    const isValidRequest = verifyKey(
      Buffer.from(rawBody),
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      console.error('Discord signature verification failed');
      return new Response('Invalid request signature', { status: 401 });
    }

    // 4. Parse the interaction data
    let interaction;
    try {
      interaction = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse interaction body:', error);
      return new Response('Invalid request body', { status: 400 });
    }

    // 5. Handle ping (PING interaction type)
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Handle application commands (APPLICATION_COMMAND interaction type)
    if (interaction.type === 2) {
      const command = interaction.data;
      
      try {
        // Handle NFT command
        if (command.name === 'nft') {
          const subcommand = command.options?.[0];
          if (!subcommand) {
            throw new Error('Please provide a collection and token ID');
          }

          const collection = subcommand.name;
          const tokenId = subcommand.options?.[0]?.value;

          if (!tokenId) {
            throw new Error('Please provide a token ID');
          }

          // Call the NFT lookup API endpoint
          const response = await fetch(`${process.env.API_BASE_URL || 'https://buxdao.com'}/api/nft-lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, tokenId })
          });

          if (!response.ok) {
            throw new Error(`NFT not found: ${COLLECTIONS[collection].name} #${tokenId}`);
          }

          const result = await response.json();
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Handle rank command
        if (command.name === 'rank') {
          const subcommand = command.options?.[0];
          if (!subcommand) {
            throw new Error('Please provide a collection and rank number');
          }

          const collection = subcommand.name;
          const rank = subcommand.options?.[0]?.value;

          if (!rank) {
            throw new Error('Please provide a rank number');
          }

          // Call the rank lookup API endpoint
          const response = await fetch(`${process.env.API_BASE_KEY || 'https://buxdao.com'}/api/nft-lookup/rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              symbol: COLLECTIONS[collection].symbol,
              rank 
            })
          });

          if (!response.ok) {
            throw new Error(`No NFT found with rank #${rank} in ${COLLECTIONS[collection].name}`);
          }

          const result = await response.json();
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        throw new Error('Unknown command');
      } catch (error) {
        console.error('Command processing error:', error);
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: `Error: ${error.message}`,
            flags: 64 // EPHEMERAL flag
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Handle unknown interaction type
    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'Unknown interaction type',
        flags: 64 // EPHEMERAL flag
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Critical interaction error:', error);
    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'An error occurred processing the command',
        flags: 64 // EPHEMERAL flag
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
} 