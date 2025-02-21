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
  const nftName = `${collectionConfig.name} #${tokenId}`;
  const requestBody = {
    symbol: collectionConfig.symbol,
    name: nftName
  };
  
  try {
    console.log('NFT lookup request:', {
      url: `${baseUrl}/api/nft-lookup`,
      method: 'POST',
      body: requestBody
    });

    // Fetch NFT data from database
    const response = await fetch(`${baseUrl}/api/nft-lookup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NFT lookup failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        request: requestBody
      });
      throw new Error(`NFT not found: ${nftName} (${response.status}: ${errorText || response.statusText})`);
    }

    const nft = await response.json();
    console.log('NFT lookup successful:', {
      name: nft.name,
      symbol: nft.symbol,
      owner: nft.owner_discord_id || nft.owner_wallet,
      request: requestBody
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
    // Verify required headers are present
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    if (!signature || !timestamp) {
      console.error('Missing headers:', { signature: !!signature, timestamp: !!timestamp });
      return new Response('Missing required headers', { status: 401 });
    }

    // Get the raw body
    const rawBody = await request.text();
    if (!rawBody) {
      console.error('Empty request body');
      return new Response('Empty request body', { status: 401 });
    }

    // Convert signature and public key
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(process.env.DISCORD_PUBLIC_KEY);

    if (!signatureBytes || !publicKeyBytes) {
      console.error('Invalid signature or public key format');
      return new Response('Invalid signature format', { status: 401 });
    }

    // Create the message
    const message = new TextEncoder().encode(timestamp + rawBody);

    try {
      // Import the public key
      const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes,
        {
          name: 'Ed25519'
        },
        false,
        ['verify']
      );

      // Verify the signature
      const isValidRequest = await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signatureBytes,
        message
      );

      if (!isValidRequest) {
        console.error('Invalid signature verification');
        return new Response('Invalid request signature', { status: 401 });
      }
    } catch (error) {
      console.error('Error during signature verification:', error);
      return new Response('Signature verification failed', { status: 401 });
    }

    const interaction = JSON.parse(rawBody);

    // Handle ping
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle application commands
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

          const result = await getNFTDetails(collection, tokenId);
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

          const result = await getNFTByRank(collection, rank);
          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        throw new Error('Unknown command');
      } catch (error) {
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
    console.error('Critical interaction error:', error);
    return new Response(JSON.stringify({
      type: 4,
      data: {
        content: 'An error occurred processing the command',
        flags: 64
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
} 