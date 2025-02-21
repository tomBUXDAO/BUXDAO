export const config = {
  runtime: 'edge',
  regions: ['iad1']  // Use Virginia for lowest latency to Discord
};

import crypto from 'crypto';
import { handleNFTLookup } from './discord/interactions/commands/nft-lookup.js';
import { handleRankLookup } from './discord/interactions/commands/rank-lookup.js';

// Helper function to convert hex string to Uint8Array
function hexToUint8Array(hex) {
  return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Helper function to format Ed25519 public key
function formatPublicKey(publicKeyHex) {
  // Ed25519 ASN.1 DER prefix
  const prefix = '302a300506032b6570032100';
  // Combine prefix with key
  const derKey = prefix + publicKeyHex;
  // Convert to PEM format
  const pemKey = [
    '-----BEGIN PUBLIC KEY-----',
    Buffer.from(derKey, 'hex').toString('base64'),
    '-----END PUBLIC KEY-----'
  ].join('\n');
  return pemKey;
}

export default async function handler(request) {
  try {
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    
    // Get the raw body
    const rawBody = await request.text();

    // Format the public key
    const publicKey = formatPublicKey(process.env.DISCORD_PUBLIC_KEY);

    // Create verify instance
    const verifier = crypto.createVerify('sha512');
    verifier.update(timestamp + rawBody);

    // Verify the signature
    const isValidRequest = verifier.verify(
      publicKey,
      Buffer.from(signature, 'hex'),
      'hex'
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