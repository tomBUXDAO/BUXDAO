import { verifyKey } from 'discord-interactions';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import { handleRankLookup } from './discord/interactions/commands/rank-lookup.js';

export const config = {
  runtime: 'edge',
  regions: ['iad1']  // Use Virginia for lowest latency to Discord
};

// Helper function to convert hex string to Uint8Array
function hexToUint8Array(hex) {
  if (!hex) return null;
  try {
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  } catch (error) {
    console.error('Error converting hex to Uint8Array:', error);
    return null;
  }
}

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

async function getNFTDetails(collection, tokenId) {
  const collectionConfig = COLLECTIONS[collection];
  if (!collectionConfig) {
    throw new Error(`Invalid collection "${collection}". Available collections: ${Object.keys(COLLECTIONS).join(', ')}`);
  }

  if (!tokenId || isNaN(tokenId)) {
    throw new Error(`Invalid token ID "${tokenId}". Please provide a valid number.`);
  }

  const baseUrl = process.env.API_BASE_URL || 'https://buxdao.com';
  
  try {
    console.log('NFT lookup request:', {
      url: `${baseUrl}/api/nft-lookup`,
      method: 'POST',
      body: {
        collection: collection,
        tokenId: tokenId,
        webhookUrl: null // We don't need webhook since we're handling the response directly
      }
    });

    // Fetch NFT data from database
    const response = await fetch(`${baseUrl}/api/nft-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        collection: collection,
        tokenId: tokenId,
        webhookUrl: null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NFT lookup failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        request: { collection, tokenId }
      });
      throw new Error(`NFT not found: ${collectionConfig.name} #${tokenId} (${response.status}: ${errorText || response.statusText})`);
    }

    const nft = await response.json();
    console.log('NFT lookup successful:', {
      name: nft.name,
      symbol: nft.symbol,
      owner: nft.owner_discord_id || nft.owner_wallet,
      request: { collection, tokenId }
    });

    // Build fields array based on available data
    const fields = [];

    // Owner field - prefer Discord name if available
    fields.push({
      name: '👤 Owner',
      value: nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : nft.owner_wallet
          ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
          : 'Unknown',
      inline: true
    });

    // Status field - show if listed and price
    fields.push({
      name: '🏷️ Status',
      value: nft.is_listed 
        ? `Listed for ${(Number(nft.list_price) || 0).toFixed(2)} SOL`
        : 'Not Listed',
      inline: true
    });

    // Last sale if available
    if (nft.last_sale_price) {
      fields.push({
        name: '💰 Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      });
    }

    // Rarity rank if collection supports it
    if (collectionConfig.hasRarity && nft.rarity_rank) {
      fields.push({
        name: '✨ Rarity Rank',
        value: `#${nft.rarity_rank}`,
        inline: true
      });
    }

    return {
      type: 4,
      data: {
        tts: false,
        content: "",
        embeds: [{
          title: nft.name,
          description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\n**Mint:** \`${nft.mint_address || 'Unknown'}\``,
          color: collectionConfig.color,
          fields: fields,
          thumbnail: {
            url: `https://buxdao.com${collectionConfig.logo}`
          },
          image: {
            url: nft.image_url || null
          },
          footer: {
            text: "BUXDAO • Putting Community First"
          }
        }],
        allowed_mentions: { parse: [] }
      }
    };
  } catch (error) {
    console.error('Error fetching NFT details:', error);
    throw new Error(`Failed to fetch NFT details: ${error.message}`);
  }
}

async function getNFTByRank(collection, rank) {
  const collectionConfig = COLLECTIONS[collection];
  if (!collectionConfig || !collectionConfig.hasRarity) {
    throw new Error(`Invalid collection "${collection}" for rank lookup. Available collections: ${Object.keys(COLLECTIONS).filter(k => COLLECTIONS[k].hasRarity).join(', ')}`);
  }

  if (!rank || isNaN(rank)) {
    throw new Error(`Invalid rank "${rank}". Please provide a valid number.`);
  }

  const baseUrl = process.env.API_BASE_URL || 'https://buxdao.com';

  try {
    // Fetch NFT data from database
    const response = await fetch(`${baseUrl}/api/nft-lookup/rank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: collectionConfig.symbol,
        rank: rank
      })
    });

    if (!response.ok) {
      throw new Error(`No NFT found with rank #${rank} in ${collectionConfig.name}`);
    }

    const nft = await response.json();

    // Build fields array based on available data
    const fields = [];

    // Owner field - prefer Discord name if available
    fields.push({
      name: '👤 Owner',
      value: nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : nft.owner_wallet
          ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
          : 'Unknown',
      inline: true
    });

    // Status field - show if listed and price
    fields.push({
      name: '🏷️ Status',
      value: nft.is_listed 
        ? `Listed for ${(Number(nft.list_price) || 0).toFixed(2)} SOL`
        : 'Not Listed',
      inline: true
    });

    // Last sale if available
    if (nft.last_sale_price) {
      fields.push({
        name: '💰 Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      });
    }

    // Always show rarity rank since these collections have it
    fields.push({
      name: '✨ Rarity Rank',
      value: `#${nft.rarity_rank}`,
      inline: true
    });

    return {
      type: 4,
      data: {
        tts: false,
        content: "",
        embeds: [{
          title: nft.name,
          description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\n**Mint:** \`${nft.mint_address || 'Unknown'}\``,
          color: collectionConfig.color,
          fields: fields,
          thumbnail: {
            url: `https://buxdao.com${collectionConfig.logo}`
          },
          image: {
            url: nft.image_url || null
          },
          footer: {
            text: "BUXDAO • Putting Community First"
          }
        }],
        allowed_mentions: { parse: [] }
      }
    };
  } catch (error) {
    console.error('Error fetching NFT by rank:', error);
    throw new Error(`Failed to fetch NFT by rank: ${error.message}`);
  }
}

export default async function handler(request) {
  try {
    // 1. Verify required headers are present
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    if (!signature || !timestamp) {
      console.error('Missing required Discord headers:', { 
        hasSignature: !!signature, 
        hasTimestamp: !!timestamp,
        headers: Object.fromEntries(request.headers)
      });
      return new Response('Invalid request signature', { status: 401 });
    }

    // 2. Get the raw body as a string
    const rawBody = await request.text();
    if (!rawBody) {
      console.error('Empty request body');
      return new Response('Invalid request', { status: 401 });
    }

    // Log request details for debugging
    console.log('Discord interaction request:', {
      method: request.method,
      url: request.url,
      headers: {
        signature: signature.slice(0, 8) + '...',
        timestamp,
        contentType: request.headers.get('content-type')
      },
      bodyLength: rawBody.length
    });

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

    // 4. Return 401 if verification fails
    if (!isValidRequest) {
      console.error('Discord signature verification failed:', {
        timestamp,
        signaturePrefix: signature.slice(0, 8) + '...',
        bodyLength: rawBody.length
      });
      return new Response('Invalid request signature', { status: 401 });
    }

    // 5. Parse the interaction data
    let interaction;
    try {
      interaction = JSON.parse(rawBody);
    } catch (error) {
      console.error('Failed to parse interaction body:', error);
      return new Response('Invalid request body', { status: 400 });
    }

    // 6. Handle ping (PING interaction type)
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 7. Handle application commands (APPLICATION_COMMAND interaction type)
    if (interaction.type === 2) {
      const command = interaction.data;
      console.log('Processing command:', {
        name: command.name,
        options: command.options,
        user: interaction.member?.user?.id || interaction.user?.id
      });

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

          console.log('Processing NFT lookup:', { collection, tokenId });
          const result = await handleNFTLookup(`${collection}.${tokenId}`);
          console.log('NFT lookup result:', result);
          
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

          console.log('Processing rank lookup:', { collection, rank });
          const result = await handleRankLookup(`${collection}.${rank}`);
          console.log('Rank lookup result:', result);
          
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
    console.error('Unknown interaction type:', interaction.type);
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