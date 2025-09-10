import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const API_BASE = import.meta.env.PROD ? 'https://buxdao.com' : 'http://localhost:3000';

export default function RemintBitBots() {
  const { publicKey, connected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const allowed = new Set([
    '9756X61QRrgDUSmfJedRyG316BoK56UME6g1n81yberA',
    'AcWwsEwgcEHz6rzUTXcnSksFZbETtc2JhA4jF7PKjp9T',
  ]);

  const canMint = connected && publicKey && allowed.has(publicKey.toString());

  const onMint = async () => {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/bitbots/remint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Mint failed');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-4">AI Bitbots Remint</h1>
      {!connected && <p>Please connect your wallet.</p>}
      {connected && !canMint && (
        <p className="text-red-400">This page is restricted.</p>
      )}
      {canMint && (
        <button
          onClick={onMint}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 px-4 py-2 rounded"
        >
          {loading ? 'Minting…' : 'Mint 1 Replacement BitBot'}
        </button>
      )}
      {error && <pre className="text-red-400 mt-4 whitespace-pre-wrap">{error}</pre>}
      {result && (
        <div className="mt-4 space-y-2">
          <div>Index: {result.index}</div>
          <div>Mint: {result.mintAddress}</div>
          <div>
            Tx: <a className="text-blue-400 underline" href={result.solscan} target="_blank" rel="noreferrer">View on Solscan</a>
          </div>
        </div>
      )}
    </div>
  );
} 