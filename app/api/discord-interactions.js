import { verifyKey } from 'discord-interactions';

export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  console.log('Received Discord interaction request');

  const signature = req.headers.get('x-signature-ed25519');
  const timestamp = req.headers.get('x-signature-timestamp');

  try {
    const body = await req.text();
    console.log('Request body:', body);

    const isValidRequest = verifyKey(
      body,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY
    );

    if (!isValidRequest) {
      console.log('Invalid request signature');
      return new Response('Invalid request signature', { status: 401 });
    }

    const interaction = JSON.parse(body);
    console.log('Interaction type:', interaction.type);

    // Handle ping
    if (interaction.type === 1) {
      return new Response(
        JSON.stringify({ type: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle commands
    if (interaction.type === 2) {
      return new Response(
        JSON.stringify({
          type: 4,
          data: {
            content: 'Test response - command received',
            flags: 64
          }
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

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
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        type: 4,
        data: {
          content: 'An error occurred',
          flags: 64
        }
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
} 