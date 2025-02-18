import { verifyKey } from 'discord-interactions';

export const config = {
  runtime: 'edge',
  regions: ['iad1']
};

export default async function handler(request) {
  // Only allow POST
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }), 
      { status: 405, headers: { 'Content-Type': 'application/json' }}
    );
  }

  try {
    // Get Discord headers
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    // Get raw body
    const rawBody = await request.text();

    // Verify the signature
    const isValid = verifyKey(
      Buffer.from(rawBody),
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValid) {
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Parse the interaction
    const interaction = JSON.parse(rawBody);

    // Handle PING
    if (interaction.type === 1) {
      return new Response(
        JSON.stringify({ type: 1 }), 
        { status: 200, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Handle commands
    if (interaction.type === 2) {
      // For NFT lookup, call our API endpoint
      if (interaction.data.name === 'nft') {
        const subcommand = interaction.data.options[0];
        const tokenId = subcommand.options[0].value;
        
        // Immediately acknowledge
        const response = new Response(
          JSON.stringify({
            type: 5,
            data: {
              content: "Processing command...",
              flags: 64
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' }}
        );

        // Call our API endpoint in the background
        fetch(`${process.env.VITE_API_URL}/api/nft-lookup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            collection: subcommand.name,
            tokenId: tokenId,
            webhookUrl: `https://discord.com/api/v10/webhooks/${process.env.DISCORD_CLIENT_ID}/${interaction.token}`
          })
        }).catch(console.error); // Log any errors but don't wait

        return response;
      }

      // Default command response
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: "Unknown command",
            flags: 64
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' }}
      );
    }

    // Handle unknown types
    return new Response(
      JSON.stringify({ error: 'Unknown interaction type' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' }}
    );

  } catch (error) {
    console.error('Discord interaction error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' }}
    );
  }
} 