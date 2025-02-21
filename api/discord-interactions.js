export const config = {
  runtime: 'edge',
  regions: ['iad1']  // Use Virginia for lowest latency to Discord
};

// Helper function to convert hex string to Uint8Array
function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

export default async function handler(request) {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    // Get the raw body
    const rawBody = await request.text();

    // Convert signature to Uint8Array
    const signatureBytes = hexToUint8Array(signature);
    const publicKeyBytes = hexToUint8Array(process.env.DISCORD_PUBLIC_KEY);
    
    // Create the message
    const message = new TextEncoder().encode(timestamp + rawBody);

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
      return new Response('Invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(rawBody);

    // Handle ping
    if (interaction.type === 1) {
      return new Response(JSON.stringify({ type: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For now, just acknowledge all commands
    if (interaction.type === 2) {
      return new Response(JSON.stringify({
        type: 4,
        data: {
          content: 'Command received! The bot is being updated, please try again in a few minutes.',
          flags: 64
        }
      }), { headers: { 'Content-Type': 'application/json' } });
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