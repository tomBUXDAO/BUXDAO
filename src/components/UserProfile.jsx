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
  const { discordUser: user } = useUser();
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cashoutAmount, setCashoutAmount] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.discord_id) {
        setIsLoading(false);
        return;
      }
      
      try {
        // First fetch total holdings to get user's data
        const totalResponse = await fetch(`${API_BASE_URL}/api/top-holders?collection=all&type=bux,nfts`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!totalResponse.ok) throw new Error('Failed to fetch holders data');
        
        const { holders } = await totalResponse.json();
        console.log('All holders data:', holders);
        console.log('Looking for Discord username:', user.discord_username);
        
        // Find user data by Discord username
        const myData = holders.find(h => h.discord_username === user.discord_username || h.address === user.discord_username);
        console.log('Found holder data:', myData);

        if (!myData) {
          console.log('No holder data found for user:', user);
          setUserData({
            wallet_address: user.wallet_address,
            balance: 0,
            unclaimed_rewards: 0,
            collections: {},
            totalCount: 0,
            roles: []
          });
          return;
        }

        // Now fetch all collections data
        const collections = ['celebcatz', 'moneymonsters3d', 'fckedcatz', 'moneymonsters', 'aibitbots'];
        const collectionResponses = await Promise.all(
          collections.map(collection => 
            fetch(`${API_BASE_URL}/api/top-holders?collection=${collection}&type=nfts`, {
              credentials: 'include',
              headers: { 'Accept': 'application/json' }
            })
          )
        );

        const collectionData = await Promise.all(
          collectionResponses.map(response => response.json())
        );

        // Extract collection counts from individual responses
        const collectionCounts = {
          'Celeb Catz': 0,
          'Money Monsters 3D': 0,
          'FCKed Catz': 0,
          'Money Monsters': 0,
          'A.I. BitBots': 0,
          'Collab Collections': 0
        };

        // Map collection data to counts by finding the user's data in each collection
        collectionData.forEach((data, index) => {
          // Find user holding by address (which is their discord username in the data)
          const userHolding = data.holders?.find(h => h.address === user.discord_username);
          
          console.log(`${collections[index]} found holding:`, userHolding);

          if (userHolding) {
            const count = parseInt(userHolding.amount.split(' ')[0]) || 0;
            switch(collections[index]) {
              case 'celebcatz':
                collectionCounts['Celeb Catz'] = count;
                break;
              case 'moneymonsters3d':
                collectionCounts['Money Monsters 3D'] = count;
                break;
              case 'fckedcatz':
                collectionCounts['FCKed Catz'] = count;
                break;
              case 'moneymonsters':
                collectionCounts['Money Monsters'] = count;
                break;
              case 'aibitbots':
                collectionCounts['A.I. BitBots'] = count;
                break;
            }
          }
        });

        // Extract total NFTs count
        const nftsMatch = myData.nfts.match(/(\d+)/);
        const totalNFTs = nftsMatch ? parseInt(nftsMatch[1]) : 0;

        // Now fetch roles
        const rolesResponse = await fetch(`${API_BASE_URL}/api/auth/roles`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (!rolesResponse.ok) throw new Error('Failed to fetch roles');
        const rolesData = await rolesResponse.json();
        console.log('Fetched roles data:', rolesData);

        // Set user data with roles directly from the response
        setUserData({
          wallet_address: user.wallet_address,
          balance: parseInt(myData.bux.replace(/,/g, '')) || 0,
          unclaimed_rewards: 0,
          collections: collectionCounts,
          totalCount: totalNFTs,
          roles: rolesData.roles || []
        });
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserData();
  }, [user]);

  // Calculate total daily yield from NFTs
  const calculateCollectionYield = (collection) => {
    const count = userData?.collections?.[collection] || 0;
    return count * (DAILY_REWARDS[collection] || 0);
  };

  const totalDailyYield = Object.keys(DAILY_REWARDS).reduce(
    (total, collection) => total + calculateCollectionYield(collection),
    0
  );

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
                    <th className="py-2 text-fuchsia-300 text-center">Count</th>
                    <th className="py-2 text-fuchsia-300 text-center">
                      <div className="text-sm">Daily</div>
                      <div className="text-sm">Yield</div>
                      <div className="text-xs">($BUX)</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userData && Object.entries(userData.collections).map(([collection, count]) => {
                    // Transform display names
                    const displayName = (() => {
                      switch(collection) {
                        case 'Money Monsters 3D': return '3D Monsters';
                        case 'FCKed Catz': return 'Fcked Catz';
                        case 'Collab Collections': return 'A.I. Collabs';
                        default: return collection;
                      }
                    })();

                    const dailyYield = (() => {
                      switch(collection) {
                        case 'Celeb Catz': return count * 20;
                        case 'Money Monsters 3D': return count * 7;
                        case 'FCKed Catz': return count * 5;
                        case 'Money Monsters': return count * 5;
                        case 'A.I. BitBots': return count * 3;
                        case 'Collab Collections': return count * 0;
                        default: return 0;
                      }
                    })();

                    return (
                      <tr key={collection} className="border-t">
                        <td className="py-2">{displayName}</td>
                        <td className="text-center py-2">{count}</td>
                        <td className="text-center py-2">{dailyYield}</td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold">
                    <td className="py-2 text-fuchsia-300">Total</td>
                    <td className="py-2 text-fuchsia-300 text-center">{userData?.totalCount || 0}</td>
                    <td className="py-2 text-fuchsia-300 text-center">{totalDailyYield}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Roles Display */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-lg p-6 shadow-lg backdrop-blur-sm border border-fuchsia-500/20">
            <h3 className="text-xl font-semibold text-white mb-4">My Roles</h3>
            <div className="flex flex-wrap gap-2">
              {(!userData?.roles || userData.roles.length === 0) && (
                <div className="text-gray-400 text-sm">
                  <p>Please connect your wallet and verify in Discord</p>
                  <p className="mt-1 text-xs">This will sync your roles and holdings.</p>
                </div>
              )}
              {userData?.roles?.map((role, index) => (
                <div 
                  key={role.id || index} 
                  className="inline-flex items-center rounded px-2 py-1"
                  style={{ backgroundColor: `${role.color}20` }}
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: role.color }}
                  />
                  {role.emoji_url && (
                    <img 
                      src={role.emoji_url}
                      alt=""
                      className="w-4 h-4 mr-1"
                    />
                  )}
                  <span className="text-sm font-medium" style={{ color: role.color }}>
                    {role.display_name}
                  </span>
                </div>
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