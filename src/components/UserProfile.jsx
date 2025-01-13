import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

const UserProfile = () => {
  const { discordUser: user, walletConnected: isAuthenticated } = useUser();
  const [holdings, setHoldings] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated) return;
      
      try {
        // Fetch holdings and rewards data
        const [holdingsRes, rewardsRes] = await Promise.all([
          fetch('/api/user/holdings', { credentials: 'include' }),
          fetch('/api/user/rewards', { credentials: 'include' })
        ]);

        if (holdingsRes.ok && rewardsRes.ok) {
          const [holdingsData, rewardsData] = await Promise.all([
            holdingsRes.json(),
            rewardsRes.json()
          ]);

          setHoldings(holdingsData);
          setRewards(rewardsData);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated]);

  const handleClaimRewards = async () => {
    try {
      const res = await fetch('/api/user/claim-rewards', {
        method: 'POST',
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        setRewards(prev => ({
          ...prev,
          unclaimedAmount: 0,
          lastClaimed: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('Failed to claim rewards:', error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="relative rounded-lg bg-gray-900 p-6 backdrop-blur-sm">
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Holder Verification Required</h3>
            <p className="text-gray-300">Please verify to view your profile and claim rewards</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg bg-gray-900 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-900 p-6 space-y-6">
      {/* User Info */}
      <div className="border-b border-gray-700 pb-4">
        <h2 className="text-2xl font-bold text-white mb-4">Profile</h2>
        <div className="flex items-center space-x-4">
          {user?.avatar && (
            <img 
              src={`https://cdn.discordapp.com/avatars/${user.discord_id}/${user.avatar}.png`}
              alt="Discord Avatar"
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <p className="text-white font-semibold">{user?.discord_username}</p>
            <p className="text-gray-400 text-sm">{user?.wallet_address}</p>
          </div>
        </div>
      </div>

      {/* NFT Holdings */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-3">NFT Holdings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {holdings?.collections?.map(collection => (
            <div key={collection.name} className="bg-gray-800 rounded p-3">
              <h4 className="text-white font-medium">{collection.name}</h4>
              <p className="text-gray-400">Owned: {collection.count}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-300 mt-2">
          Total NFTs: {holdings?.totalCount || 0}
        </p>
      </div>

      {/* Server Roles */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Roles</h3>
        <div className="flex flex-wrap gap-2">
          {holdings?.roles?.map(role => (
            <span 
              key={role.id}
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: role.color || '#4A5568', color: '#fff' }}
            >
              {role.name}
            </span>
          ))}
        </div>
      </div>

      {/* Daily Rewards */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-3">Daily Rewards</h3>
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-300">Daily Yield</span>
            <span className="text-white font-medium">{rewards?.dailyYield || 0} BUX</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Unclaimed Rewards</span>
            <span className="text-white font-medium">{rewards?.unclaimedAmount || 0} BUX</span>
          </div>
          <button
            onClick={handleClaimRewards}
            disabled={!rewards?.unclaimedAmount}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              rewards?.unclaimedAmount
                ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            Claim Rewards
          </button>
          {rewards?.lastClaimed && (
            <p className="text-gray-400 text-sm text-center">
              Last claimed: {new Date(rewards.lastClaimed).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 