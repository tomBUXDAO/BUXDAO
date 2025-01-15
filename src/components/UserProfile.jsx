import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:3001';

// NFT reward allocations
const DAILY_REWARDS = {
  'Celeb Catz': 20,
  'Money Monsters 3D': 7,
  'FCKed Catz': 5,
  'Money Monsters': 5,
  'A.I. BitBots': 3,
  'Collab Collections': 1
};

// Map DB symbols to display names
const SYMBOL_TO_NAME = {
  'CelebCatz': 'Celeb Catz',
  'MM3D': 'Money Monsters 3D',
  'FCKEDCATZ': 'FCKed Catz',
  'MM': 'Money Monsters',
  'AIBB': 'A.I. BitBots'
};

const UserProfile = () => {
  const { discordUser: user, walletConnected: isAuthenticated } = useUser();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cashoutAmount, setCashoutAmount] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!isAuthenticated || !user?.wallet_address) {
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/top-holders?collection=all&type=bux,nfts`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch holders data');
        
        const { holders } = await response.json();
        console.log('Looking for Discord username:', user.discord_username);
        
        // Find user data by Discord username
        const myData = holders.find(h => h.address === user.discord_username);
        console.log('Found holder data:', myData);

        if (myData) {
          setUserData({
            wallet_address: user.wallet_address,
            balance: parseInt(myData.bux.replace(/,/g, '')) || 0,
            unclaimed_rewards: 0,
            collections: {
              'Celeb Catz': parseInt(myData.celebcatz_count) || 0,
              'Money Monsters 3D': parseInt(myData.mm3d_count) || 0,
              'FCKed Catz': parseInt(myData.fckedcatz_count) || 0,
              'Money Monsters': parseInt(myData.mm_count) || 0,
              'A.I. BitBots': parseInt(myData.aibb_count) || 0,
              'Collab Collections': parseInt(myData.collab_count) || 0
            },
            totalCount: parseInt(myData.nfts) || 0,
            roles: user.roles || []
          });
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [isAuthenticated, user]);

  // Calculate total daily yield from NFTs
  const calculateCollectionYield = (collection) => {
    const count = userData?.collections?.[collection] || 0;
    return count * (DAILY_REWARDS[collection] || 0);
  };

  const totalDailyYield = Object.keys(DAILY_REWARDS).reduce(
    (total, collection) => total + calculateCollectionYield(collection),
    0
  );

  if (!isAuthenticated) {
    return (
      <div className="relative rounded-lg bg-gradient-to-br from-fuchsia-600 via-violet-600 to-blue-600 p-6 backdrop-blur-sm">
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-fuchsia-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Holder Verification Required</h3>
            <p className="text-fuchsia-200">Please verify to view your profile and claim rewards</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-lg bg-gradient-to-br from-fuchsia-600 via-violet-600 to-blue-600 p-8 mx-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-white/20 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-white/20 rounded w-1/2 mx-auto"></div>
          <div className="h-4 bg-white/20 rounded w-5/6 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-6xl font-bold text-purple-400 text-center">My BUX</h2>
      <div className="p-8 mx-8 space-y-8">
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* NFT Holdings */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-lg p-6 shadow-lg backdrop-blur-sm border border-fuchsia-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">My NFTs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-fuchsia-500/30">
                    <th className="py-2 text-fuchsia-300">Collection</th>
                    <th className="py-2 text-fuchsia-300 text-right">Count</th>
                    <th className="py-2 text-fuchsia-300 text-right">Daily Yield</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(DAILY_REWARDS).map(([collection, reward]) => {
                    const count = userData?.collections?.[collection] || 0;
                    return (
                      <tr key={collection} className="border-b border-fuchsia-500/10">
                        <td className="py-2 text-violet-100">{collection}</td>
                        <td className="py-2 text-violet-100 text-right">{count}</td>
                        <td className="py-2 text-violet-100 text-right">{count * reward} $BUX</td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td className="py-2 text-fuchsia-300">Total</td>
                    <td className="py-2 text-fuchsia-300 text-right">{userData?.totalCount || 0}</td>
                    <td className="py-2 text-fuchsia-300 text-right">{totalDailyYield} $BUX</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Server Roles */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-lg p-6 shadow-lg backdrop-blur-sm border border-fuchsia-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">My Roles</h3>
            <div className="flex flex-wrap gap-2">
              {userData?.roles?.map(role => (
                <span 
                  key={role.id}
                  className="px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-lg"
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>

          {/* Claim & Cashout */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-lg p-6 shadow-lg backdrop-blur-sm border border-fuchsia-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">Claim & Cashout</h3>
            
            {/* Unclaimed Rewards */}
            <div className="mb-6">
              <p className="text-fuchsia-300 mb-2">Unclaimed Rewards</p>
              <p className="text-2xl font-bold text-white mb-3">
                {userData?.unclaimed_rewards || 0} $BUX
              </p>
              <button
                className="w-full py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white transition-all hover:from-fuchsia-600 hover:to-violet-600 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg"
                disabled={!userData?.unclaimed_rewards}
              >
                Claim Rewards
              </button>
            </div>

            {/* Cashout Section */}
            <div>
              <p className="text-fuchsia-300 mb-2">BUX Balance</p>
              <p className="text-2xl font-bold text-white mb-3">
                {userData?.balance || 0} $BUX
              </p>
              <div className="space-y-3">
                <input
                  type="number"
                  value={cashoutAmount}
                  onChange={(e) => setCashoutAmount(e.target.value)}
                  placeholder="Enter amount to cashout"
                  className="w-full p-2 border border-fuchsia-500/30 rounded-lg bg-gray-900/50 text-white placeholder-fuchsia-300/50 focus:outline-none focus:border-fuchsia-400 shadow-inner"
                />
                <p className="text-sm text-fuchsia-300">
                  Value: {(cashoutAmount * 0.00001).toFixed(6)} SOL
                </p>
                <button
                  className="w-full py-2 px-4 rounded-lg font-medium bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white transition-all hover:from-fuchsia-600 hover:to-violet-600 disabled:from-gray-700 disabled:to-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg"
                  disabled={!cashoutAmount || cashoutAmount <= 0}
                >
                  Cashout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 