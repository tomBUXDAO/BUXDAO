import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export const UserContext = createContext();

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

  useEffect(() => {
    const checkAuth = async () => {
      if (!initialized) {
        setLoading(true);
        try {
          const response = await fetch(`${API_BASE}/api/auth/check`, {
            credentials: 'include',
            headers: {
              'Accept': 'application/json'
            },
            cache: 'no-store'
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const text = await response.text();
          if (!text) {
            throw new Error('Empty response');
          }

          try {
            const data = JSON.parse(text);
            if (data.authenticated && data.user) {
              setDiscordUser(data.user);
            }
          } catch (parseError) {
            console.error('Failed to parse response:', text);
            throw parseError;
          }
        } catch (err) {
          console.error('Auth check failed:', err);
          setDiscordUser(null);
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
      console.log('Initiating logout...');
      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Failed to parse logout response:', e);
        throw new Error('Invalid server response');
      }
      
      if (!response.ok) {
        console.error('Logout failed:', data);
        throw new Error(data.details || 'Logout failed');
      }
      
      console.log('Logout successful, clearing state...');
      
      // Reset state
      setDiscordUser(null);
      setInitialized(false);
      
      // Disconnect wallet if connected
      if (connected) {
        await disconnect();
      }

      // Force reload to clear any cached state
      window.location.reload();
    } catch (err) {
      console.error('Logout failed:', err);
      // Continue with state reset even if server logout fails
      setDiscordUser(null);
      setInitialized(false);
      if (connected) {
        await disconnect();
      }
      window.location.reload();
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