import { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const { publicKey, connected, disconnect } = useWallet();
  const [discordUser, setDiscordUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://buxdao.com' 
    : 'http://localhost:3001';

  // Check auth status on mount and when wallet changes
  useEffect(() => {
    const checkAuth = async () => {
      if (!initialized) {
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE}/api/auth/check`, {
            credentials: 'include'
          });

          if (response.ok) {
            const data = await response.json();
            if (data.authenticated && data.user) {
              setDiscordUser(data.user);
            }
          }
        } catch (err) {
          console.error('Auth check failed:', err);
        } finally {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    checkAuth();
  }, [initialized, connected]);

  // Handle wallet disconnection
  useEffect(() => {
    if (!connected && discordUser) {
      handleLogout();
    }
  }, [connected]);

  const handleLogout = async () => {
    try {
      // Clear cookies
      document.cookie = 'discord_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      document.cookie = 'discord_user=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
      // Reset state
      setDiscordUser(null);
      setInitialized(false);
      
      // Disconnect wallet if connected
      if (connected) {
        disconnect();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const value = {
    discordUser,
    setDiscordUser,
    loading,
    handleLogout,
    walletConnected: connected,
    walletAddress: publicKey?.toString(),
  };

  // Don't render children until we've checked auth status
  if (!initialized && loading) {
    return null;
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext; 