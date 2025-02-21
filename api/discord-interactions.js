// Edge Function configuration
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

// Helper function to validate collection
function validateCollection(collection, requireRarity = false) {
  const config = COLLECTIONS[collection];
  if (!config) {
    throw new Error(`Invalid collection "${collection}". Available collections: ${Object.keys(COLLECTIONS).join(', ')}`);
  }
  if (requireRarity && !config.hasRarity) {
    throw new Error(`Collection "${config.name}" does not support rarity ranking. Available collections for rank lookup: ${Object.keys(COLLECTIONS).filter(k => COLLECTIONS[k].hasRarity).map(k => COLLECTIONS[k].name).join(', ')}`);
  }
  return config;
}

async function verifyDiscordRequest(body, signature, timestamp, clientPublicKey) {
  try {
    // Convert hex strings to Uint8Arrays
    const signatureUint8 = new Uint8Array(
      signature.match(/.{2}/g).map(byte => parseInt(byte, 16))
    );
    
    const publicKeyUint8 = new Uint8Array(
      clientPublicKey.match(/.{2}/g).map(byte => parseInt(byte, 16))
    );

    // Concatenate timestamp and body
    const timestampData = new TextEncoder().encode(timestamp);
    const bodyData = new TextEncoder().encode(body);
    const message = new Uint8Array(timestampData.length + bodyData.length);
    message.set(timestampData);
    message.set(bodyData, timestampData.length);

    // Import public key
    const key = await crypto.subtle.importKey(
      'raw',
      publicKeyUint8,
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519'
      },
      false,
      ['verify']
    );

    // Verify signature
    return await crypto.subtle.verify(
      'Ed25519',
      key,
      signatureUint8,
      message
    );
  } catch (err) {
    console.error('Error verifying request:', err);
    return false;
  }
}

export default async function handler(request) {
  try {
    // Get the raw body and headers
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const rawBody = await request.text();

    // Log headers for debugging
    console.log('Discord headers:', {
      signature,
      timestamp,
      hasBody: !!rawBody,
      bodyLength: rawBody.length
    });

    // Validate required headers
    if (!signature || !timestamp || !rawBody) {
      console.error('Missing required Discord headers:', {
        hasSignature: !!signature,
        hasTimestamp: !!timestamp,
        hasBody: !!rawBody
      });
      return new Response('Invalid request signature', { status: 401 });
    }

    // Verify the request is from Discord
    const isValidRequest = await verifyDiscordRequest(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      console.error('Discord signature verification failed');
      return new Response('Invalid request signature', { status: 401 });
    }

    // Parse the interaction data
    const interaction = JSON.parse(rawBody);

    // Handle ping (PING interaction type)
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle commands
    if (interaction.type === 2) {
      const command = interaction.data;
      const baseUrl = process.env.API_BASE_URL || 'https://buxdao.com';

      try {
        // Handle NFT command
        if (command.name === 'nft') {
          const subcommand = command.options?.[0];
          if (!subcommand) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a collection and token ID',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const collection = subcommand.name;
          const tokenId = subcommand.options?.[0]?.value;

          if (!tokenId) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a token ID',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          // Validate collection
          const collectionConfig = validateCollection(collection);

          // Call NFT lookup
          const response = await fetch(`${baseUrl}/api/nft-lookup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, tokenId, symbol: collectionConfig.symbol })
          });

          const result = await response.json();
          
          // Log the response for debugging
          console.log('NFT lookup response:', JSON.stringify(result));

          // Return exact response structure
          return new Response(JSON.stringify({
            type: 4,
            data: {
              embeds: result.data?.embeds || result.embeds || [{
                title: `Error retrieving NFT`,
                description: result.error || 'Unknown error occurred',
                color: 0xFF0000
              }]
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        // Handle rank command
        if (command.name === 'rank') {
          const subcommand = command.options?.[0];
          if (!subcommand) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a collection and rank number',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const collection = subcommand.name;
          const rank = subcommand.options?.[0]?.value;

          if (!rank) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                content: 'Please provide a rank number',
                flags: 64
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          // Validate collection
          const collectionConfig = validateCollection(collection, true);

          // Call rank lookup
          const response = await fetch(`${baseUrl}/api/nft-lookup/rank`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection, rank, symbol: collectionConfig.symbol })
          });

          const result = await response.json();
          
          // Log the response for debugging
          console.log('Rank lookup response:', JSON.stringify(result));

          // Return exact response structure
          return new Response(JSON.stringify({
            type: 4,
            data: {
              embeds: result.data?.embeds || result.embeds || [{
                title: `Error retrieving rank`,
                description: result.error || 'Unknown error occurred',
                color: 0xFF0000
              }]
            }
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: 'Unknown command',
            flags: 64
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        console.error('Command error:', error);
        return new Response(JSON.stringify({
          type: 4,
          data: {
            content: `Error: ${error.message}`,
            flags: 64
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'Unknown interaction type',
        flags: 64
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Critical error:', error);
    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'An error occurred processing the command',
        flags: 64
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
} 