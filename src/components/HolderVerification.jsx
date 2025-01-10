import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useLocation } from 'react-router-dom';
import { DiscordIcon } from './Icons';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

// Helper function to generate random string for state parameter
const generateRandomString = (length) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const HolderVerification = () => {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [discordUser, setDiscordUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [discordConnected, setDiscordConnected] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, verified, failed
  const location = useLocation();

  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://buxdao.com' 
    : 'http://localhost:3001';

  useEffect(() => {
    // Handle Discord OAuth callback
    const handleCallback = async () => {
      const searchParams = new URLSearchParams(location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', decodeURIComponent(error));
        setError('Failed to connect with Discord. Please try again.');
        return;
      }

      if (code) {
        setLoading(true);
        try {
          // Include state parameter in callback
          window.location.href = `${API_BASE}/api/auth/discord/callback?code=${code}&state=${state}`;
          return;
        } catch (err) {
          console.error('Discord callback error:', err);
          setError('Failed to authenticate with Discord. Please try again.');
        } finally {
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, [location]);

  useEffect(() => {
    // Only check for error param if we haven't already connected and there's been an auth attempt
    if (!discordConnected) {
      const params = new URLSearchParams(window.location.search);
      const errorParam = params.get('error');
      const code = params.get('code');
      // Only show error if we're handling a callback (code present) or explicit error
      if (errorParam && (code || params.get('state'))) {
        setError(decodeURIComponent(errorParam));
        // Clear the error from URL without triggering a refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [discordConnected]);

  useEffect(() => {
    // Only check auth if there's no code in the URL (initial load)
    if (!location.search.includes('code=')) {
      const checkAuth = async () => {
        try {
          const response = await fetch(`${API_BASE}/api/auth/check`, {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.user) {
              setDiscordUser(data.user);
              setError(null);
            }
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          // Don't set error here as this is a normal state for new users
        }
      };

      checkAuth();
    }
  }, [location]);

  const handleDiscordLogin = () => {
    setError(null); // Clear any existing errors
    setIsLoading(true);
    
    try {
      // Redirect to backend auth endpoint
      window.location.href = `${API_BASE}/api/auth/discord`;
    } catch (err) {
      console.error('Error initiating Discord login:', err);
      setError('Failed to initiate Discord login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDiscordLogout = async () => {
    try {
      // Clear cookies
      document.cookie = 'discord_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'discord_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Reset state
      setDiscordUser(null);
      setVerificationStatus('pending');
      
      // Disconnect wallet if connected
      if (connected) {
        disconnect();
      }
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Failed to logout');
    }
  };

  // Add wallet connection status effect
  useEffect(() => {
    if (connected && publicKey) {
      console.log('Wallet connected:', publicKey.toString());
      setWalletConnected(true);
    } else {
      console.log('Wallet disconnected');
      setWalletConnected(false);
    }
  }, [connected, publicKey]);

  const handleWalletVerification = async () => {
    if (!connected || !publicKey || !discordUser) return;

    setLoading(true);
    setError(null);

    try {
      // Call the wallet verification endpoint
      const response = await fetch(`${API_BASE}/api/auth/wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString(),
          discord_id: discordUser.discord_id,
          discord_username: discordUser.discord_username
        }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      // Update local state with roles
      setVerificationStatus('verified');
      
      // Show success message
      setError('Successfully verified.');

    } catch (err) {
      console.error('Wallet verification failed:', err);
      setError(err.message);
      setVerificationStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletConnection = () => {
    if (!connected) {
      try {
        console.log('Opening wallet modal...');
        setVisible(true);
      } catch (error) {
        console.error('Error opening wallet modal:', error);
        setError('Failed to open wallet connection modal. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto p-6 bg-gray-900 rounded-xl shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6">Holder Verification</h2>

        {/* Discord Connection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            Step 1: Connect Discord
            {discordUser && <span className="text-green-400">✓</span>}
          </h3>
          {discordUser ? (
            <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center space-x-4">
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
              <button
                onClick={handleDiscordLogout}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded-lg"
                title="Logout"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleDiscordLogin}
              disabled={loading}
              className="flex items-center justify-center space-x-3 bg-[#5865F2] px-8 py-3 rounded-full text-white text-base sm:text-lg hover:opacity-90 transition-opacity border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] whitespace-nowrap w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DiscordIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>{loading ? 'Connecting...' : 'Login'}</span>
            </button>
          )}
        </div>

        {/* Wallet Connection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
            Step 2: Connect Wallet
            {connected && <span className="text-green-400">✓</span>}
          </h3>
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
              onClick={handleWalletConnection}
              disabled={!discordUser}
              className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!discordUser ? 'Connect Discord First' : 'Connect Wallet'}
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
               verificationStatus === 'verified' ? 'Successfully verified ✓' : 
               'Verify Holdings'}
            </button>

            {error && (
              <p className="mt-4 text-gray-300 text-sm">
                {verificationStatus === 'verified' ? (
                  <>
                    Successfully verified.<br/>
                    <span className="text-purple-400">You can view your full server role list in profile</span>
                  </>
                ) : (
                  <span className="text-red-500">{error}</span>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HolderVerification; 