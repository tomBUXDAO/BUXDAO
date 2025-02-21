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
                embeds: [{
                  title: 'Error',
                  description: 'Please provide a collection and token ID',
                  color: 0xFF0000
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const collection = subcommand.name;
          const tokenId = subcommand.options?.[0]?.value;

          if (!tokenId) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                embeds: [{
                  title: 'Error',
                  description: 'Please provide a token ID',
                  color: 0xFF0000
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          // Validate collection
          const collectionConfig = validateCollection(collection);

          // Query database directly
          const client = await pool.connect();
          try {
            const result = await client.query(
              'SELECT * FROM nft_metadata WHERE symbol = $1 AND name LIKE $2',
              [collectionConfig.symbol, `%#${tokenId}`]
            );

            if (!result.rows.length) {
              return new Response(JSON.stringify({
                type: 4,
                data: {
                  embeds: [{
                    title: 'Error',
                    description: `${collectionConfig.name} #${tokenId} not found in database`,
                    color: 0xFF0000
                  }]
                }
              }), { headers: { 'Content-Type': 'application/json' } });
            }

            const nft = result.rows[0];
            const fields = [];

            // Owner field
            fields.push({
              name: '👤 Owner',
              value: nft.owner_name 
                ? `<@${nft.owner_discord_id}>`
                : nft.owner_wallet
                  ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
                  : 'Unknown',
              inline: true
            });

            // Status field
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

            return new Response(JSON.stringify({
              type: 4,
              data: {
                embeds: [{
                  title: nft.name,
                  description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\nMint: \`${nft.mint_address || 'Unknown'}\``,
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
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });

          } catch (error) {
            console.error('Database error:', error);
            return new Response(JSON.stringify({
              type: 4,
              data: {
                embeds: [{
                  title: 'Error',
                  description: error.message,
                  color: 0xFF0000
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          } finally {
            await client.release();
          }
        }

        // Handle rank command
        if (command.name === 'rank') {
          const subcommand = command.options?.[0];
          if (!subcommand) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                embeds: [{
                  title: 'Error',
                  description: 'Please provide a collection and rank number',
                  color: 0xFF0000
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          const collection = subcommand.name;
          const rank = subcommand.options?.[0]?.value;

          if (!rank) {
            return new Response(JSON.stringify({
              type: 4,
              data: {
                embeds: [{
                  title: 'Error',
                  description: 'Please provide a rank number',
                  color: 0xFF0000
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          }

          // Validate collection
          const collectionConfig = validateCollection(collection, true);

          // Query database directly
          const client = await pool.connect();
          try {
            const result = await client.query(
              `SELECT * 
               FROM nft_metadata 
               WHERE symbol = $1 
               AND rarity_rank = $2 
               LIMIT 1`,
              [collectionConfig.symbol, rank]
            );

            if (!result.rows.length) {
              return new Response(JSON.stringify({
                type: 4,
                data: {
                  embeds: [{
                    title: 'Error',
                    description: `No NFT found with rank #${rank} in ${collectionConfig.name}`,
                    color: 0xFF0000
                  }]
                }
              }), { headers: { 'Content-Type': 'application/json' } });
            }

            const nft = result.rows[0];
            const fields = [];

            // Owner field
            fields.push({
              name: '👤 Owner',
              value: nft.owner_name 
                ? `<@${nft.owner_discord_id}>`
                : nft.owner_wallet
                  ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
                  : 'Unknown',
              inline: true
            });

            // Status field
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

            // Always show rarity rank
            fields.push({
              name: '✨ Rarity Rank',
              value: `#${nft.rarity_rank}`,
              inline: true
            });

            return new Response(JSON.stringify({
              type: 4,
              data: {
                embeds: [{
                  title: nft.name,
                  description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\nMint: \`${nft.mint_address || 'Unknown'}\``,
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
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });

          } catch (error) {
            console.error('Database error:', error);
            return new Response(JSON.stringify({
              type: 4,
              data: {
                embeds: [{
                  title: 'Error',
                  description: error.message,
                  color: 0xFF0000
                }]
              }
            }), { headers: { 'Content-Type': 'application/json' } });
          } finally {
            await client.release();
          }
        }

        return new Response(JSON.stringify({
          type: 4,
          data: {
            embeds: [{
              title: 'Error',
              description: 'Unknown command',
              color: 0xFF0000
            }]
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        console.error('Command error:', error);
        return new Response(JSON.stringify({
          type: 4,
          data: {
            embeds: [{
              title: 'Error',
              description: error.message,
              color: 0xFF0000
            }]
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    return new Response(JSON.stringify({
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Unknown interaction type',
          color: 0xFF0000
        }]
      }
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Critical error:', error);
    return new Response(JSON.stringify({
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'An error occurred processing the command',
          color: 0xFF0000
        }]
      }
    }), { headers: { 'Content-Type': 'application/json' } });
  }
} 