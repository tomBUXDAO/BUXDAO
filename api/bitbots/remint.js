import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';

dotenv.config();

const ALLOWED_WALLETS = new Set([
  '9756X61QRrgDUSmfJedRyG316BoK56UME6g1n81yberA',
  'AcWwsEwgcEHz6rzUTXcnSksFZbETtc2JhA4jF7PKjp9T',
]);

const WALLET_LIMITS = {
  '9756X61QRrgDUSmfJedRyG316BoK56UME6g1n81yberA': 12,
  'AcWwsEwgcEHz6rzUTXcnSksFZbETtc2JhA4jF7PKjp9T': 1,
};

const BURNED_INDICES = [4, 19, 62, 70, 86, 87, 88, 98, 104, 121, 135, 148, 209];
const COLLECTION_MINT = '41swUeWc8Hm87T7ahtndUWfDTLRWndWYFpuE4UKp79Vq';

const PROGRESS_FILE = path.resolve('logs/remint-progress.json');
const METADATA_MAP_FILE = path.resolve('logs/metadata-upload-results.json');

function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { mintedIndices: [], walletMints: {} };
  }
}

function saveProgress(progress) {
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

function loadMetadataMap() {
  const fallback = {};
  try {
    const raw = fs.readFileSync(METADATA_MAP_FILE, 'utf8');
    const arr = JSON.parse(raw);
    for (const entry of arr) {
      const key = entry.filename.replace('missing-', '').replace('.json', '');
      fallback[parseInt(key, 10)] = entry.gateway_url;
    }
  } catch (e) {}
  return fallback;
}

async function readJsonBody(req) {
  return new Promise((resolve) => {
    try {
      if (req.body && typeof req.body === 'object') return resolve(req.body);
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve(parsed);
        } catch (e) {
          resolve({});
        }
      });
    } catch (e) {
      resolve({});
    }
  });
}

async function mintOne({ index, metadataUri, metaplex }) {
  const { nft, response } = await metaplex.nfts().create({
    uri: metadataUri,
    name: `AI Bitbot #${index}`,
    symbol: 'AIBB',
    sellerFeeBasisPoints: 800,
    creators: [
      { address: new PublicKey('A1J3zLznRueKFiAqukqM8S7PWhuBPUUrD2zXNFK9exXp'), verified: true, share: 0 },
      { address: new PublicKey('3WNHW6sr1sQdbRjovhPrxgEJdWASZ43egGWMMNrhgoRR'), verified: false, share: 100 },
    ],
    isCollection: false,
    collection: new PublicKey(COLLECTION_MINT),
    collectionDetails: null,
    uses: null,
    isMutable: true,
    maxSupply: 0,
  });
  return { mintAddress: nft.address.toString(), signature: response.signature };
}

export default async function handler(req, res) {
  const ORIGIN = process.env.NODE_ENV === 'production' ? 'https://buxdao.com' : 'http://localhost:5173';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await readJsonBody(req);
    const wallet = body.wallet;

    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Missing wallet' });
    }

    if (!ALLOWED_WALLETS.has(wallet)) {
      return res.status(403).json({ error: 'Wallet not allowed' });
    }

    const privateKeyString = process.env.BITBOTS_PRIVATE_KEY;
    if (!privateKeyString) {
      return res.status(500).json({ error: 'Server missing BITBOTS_PRIVATE_KEY' });
    }

    const metadataMap = loadMetadataMap();
    const progress = loadProgress();

    const mintedSet = new Set(progress.mintedIndices || []);
    const remaining = BURNED_INDICES.filter(i => !mintedSet.has(i));
    if (remaining.length === 0) {
      return res.status(400).json({ error: 'All replacement BitBots already minted' });
    }

    const walletCount = progress.walletMints?.[wallet] || 0;
    const walletLimit = WALLET_LIMITS[wallet] || 0;
    if (walletCount >= walletLimit) {
      return res.status(403).json({ error: 'Wallet mint limit reached' });
    }

    const index = remaining.sort((a, b) => a - b)[0];
    const metadataUri = metadataMap[index];
    if (!metadataUri) {
      return res.status(500).json({ error: `Missing metadata URI for index ${index}` });
    }

    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKeyString));
    const metaplex = Metaplex.make(connection).use(keypairIdentity(keypair));

    const result = await mintOne({ index, metadataUri, metaplex });

    mintedSet.add(index);
    const updated = {
      mintedIndices: Array.from(mintedSet).sort((a, b) => a - b),
      walletMints: { ...progress.walletMints, [wallet]: walletCount + 1 },
      lastMint: { index, wallet, mintAddress: result.mintAddress, signature: result.signature, at: new Date().toISOString() },
    };
    saveProgress(updated);

    return res.status(200).json({
      ok: true,
      index,
      mintAddress: result.mintAddress,
      signature: result.signature,
      solscan: `https://solscan.io/tx/${result.signature}`,
    });
  } catch (error) {
    console.error('Remint error:', error);
    return res.status(500).json({ error: error.message });
  }
} 