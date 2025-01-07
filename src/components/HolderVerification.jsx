import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const HolderVerification = () => {
  const { publicKey, connected, connect, disconnect } = useWallet();
  const [discordUser, setDiscordUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verified, failed

  useEffect(() => {
    // Check if user is already authenticated with Discord
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.user) {
          setDiscordUser(data.user);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
      }
    };

    checkAuth();
  }, []);

  const handleDiscordLogin = () => {
    window.location.href = '/api/auth/discord';
  };

  const handleWalletVerification = async () => {
    if (!connected || !publicKey || !discordUser) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          discord_id: discordUser.discord_id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setVerificationStatus('verified');
    } catch (err) {
      console.error('Wallet verification failed:', err);
      setError(err.message);
      setVerificationStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-gray-900 rounded-xl shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-6">Holder Verification</h2>

      {/* Discord Connection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Step 1: Connect Discord</h3>
        {discordUser ? (
          <div className="flex items-center space-x-4 bg-gray-800 p-4 rounded-lg">
            <img 
              src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
              alt={discordUser.discord_username}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="text-white font-medium">{discordUser.discord_username}</p>
              <p className="text-green-400 text-sm">Connected</p>
            </div>
          </div>
        ) : (
          <button
            onClick={handleDiscordLogin}
            className="w-full bg-[#5865F2] text-white px-6 py-3 rounded-lg hover:bg-[#4752C4] transition-colors"
          >
            Connect Discord Account
          </button>
        )}
      </div>

      {/* Wallet Connection */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">Step 2: Connect Wallet</h3>
        {connected ? (
          <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
            <div>
              <p className="text-white font-medium">{publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}</p>
              <p className="text-green-400 text-sm">Connected</p>
            </div>
            <button
              onClick={disconnect}
              className="text-gray-400 hover:text-white transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Verification Status */}
      {discordUser && connected && (
        <div className="text-center">
          <button
            onClick={handleWalletVerification}
            disabled={loading || verificationStatus === 'verified'}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              verificationStatus === 'verified'
                ? 'bg-green-600 text-white cursor-not-allowed'
                : loading
                ? 'bg-gray-600 text-white cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
            }`}
          >
            {loading ? 'Verifying...' : 
             verificationStatus === 'verified' ? 'Verified ✓' : 
             'Verify Holdings'}
          </button>

          {error && (
            <p className="mt-4 text-red-500 text-sm">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default HolderVerification; 