import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { API_BASE_URL } from '../config';

// NFT reward allocations
const DAILY_REWARDS = {
  'celeb_catz_count': 20,
  'money_monsters_3d_count': 7,
  'fcked_catz_count': 5,
  'money_monsters_count': 5,
  'aibitbots_count': 3,
  'ai_collabs_count': 1
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
  const { discordUser } = useUser();
  const [userData, setUserData] = useState({
    wallet_address: discordUser?.wallet_address || '',
    balance: 0,
    unclaimed_rewards: 0,
    collections: {
      'celeb_catz_count': 0,
      'money_monsters_3d_count': 0,
      'fcked_catz_count': 0,
      'money_monsters_count': 0,
      'aibitbots_count': 0,
      'ai_collabs_count': 0,
      'money_monsters_top_10': 0,
      'money_monsters_3d_top_10': 0,
      'branded_catz_count': 0
    },
    totalCount: 0,
    roles: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [cashoutAmount, setCashoutAmount] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!discordUser?.discord_id) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch collection counts
        console.log('Fetching collection counts for discord_id:', discordUser.discord_id);
        const collectionCountsResponse = await fetch(`${API_BASE_URL}/api/collection-counts/${discordUser.discord_id}`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (!collectionCountsResponse.ok) {
          console.error('Failed to fetch collection counts:', await collectionCountsResponse.text());
        } else {
          const collectionData = await collectionCountsResponse.json();
          console.log('Collection counts:', collectionData);

          // Map collection counts to the expected format
          const collectionCounts = {
            'celeb_catz_count': collectionData.celeb_catz_count || 0,
            'money_monsters_3d_count': collectionData.money_monsters_3d_count || 0,
            'fcked_catz_count': collectionData.fcked_catz_count || 0,
            'money_monsters_count': collectionData.money_monsters_count || 0,
            'aibitbots_count': collectionData.aibitbots_count || 0,
            'ai_collabs_count': collectionData.ai_collabs_count || 0,
            'money_monsters_top_10': collectionData.money_monsters_top_10 || 0,
            'money_monsters_3d_top_10': collectionData.money_monsters_3d_top_10 || 0,
            'branded_catz_count': collectionData.branded_catz_count || 0
          };

          // Update state with collection data
          setUserData(prev => ({
            ...prev,
            collections: collectionCounts,
            totalCount: collectionData.total_count || 0,
            balance: collectionData.balance || 0,
            unclaimed_rewards: collectionData.unclaimed_rewards || 0
          }));
        }

        // Now fetch roles
        const rolesResponse = await fetch(`${API_BASE_URL}/api/auth/roles`, {
          credentials: 'include',
          headers: { 'Accept': 'application/json' }
        });

        if (!rolesResponse.ok) {
          console.error('Failed to fetch roles:', await rolesResponse.text());
        } else {
          const rolesData = await rolesResponse.json();
          console.log('Roles data:', rolesData);

          // Update state with roles
          setUserData(prev => ({
            ...prev,
            roles: rolesData.roles || []
          }));
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [discordUser]);

  // Calculate total daily yield from NFTs
  const calculateCollectionYield = (collection) => {
    const count = userData?.collections?.[collection] || 0;
    return count * (DAILY_REWARDS[collection] || 0);
  };

  // Calculate top 10 yield
  const calculateTop10Yield = () => {
    const mm10Count = userData?.collections?.['money_monsters_top_10'] || 0;
    const mm3d10Count = userData?.collections?.['money_monsters_3d_top_10'] || 0;
    return (mm10Count * 5) + (mm3d10Count * 7); // 5 BUX for MM top 10, 7 BUX for MM3D top 10
  };

  // Calculate branded cats yield
  const calculateBrandedCatzYield = () => {
    const brandedCount = userData?.collections?.['branded_catz_count'] || 0;
    return brandedCount * 5; // 5 BUX for each branded cat
  };

  const totalDailyYield = Object.keys(DAILY_REWARDS).reduce(
    (total, collection) => total + calculateCollectionYield(collection),
    0
  ) + calculateTop10Yield() + calculateBrandedCatzYield();

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
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <img src="/emojis/image.svg" alt="" className="w-6 h-6" />
              My NFTs <span className="text-sm font-normal text-gray-400">(unlisted)</span>
            </h3>
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
                  {Object.entries(userData.collections).map(([collection, count]) => {
                    // Skip top 10 and branded collections as they'll be handled separately
                    if (collection === 'money_monsters_top_10' || 
                        collection === 'money_monsters_3d_top_10' ||
                        collection === 'branded_catz_count') {
                      return null;
                    }

                    // Transform display names
                    const displayName = (() => {
                      switch(collection) {
                        case 'money_monsters_3d_count': return '3D Monsters';
                        case 'fcked_catz_count': return 'Fcked Catz';
                        case 'celeb_catz_count': return 'Celeb Catz';
                        case 'money_monsters_count': return 'Money Monsters';
                        case 'aibitbots_count': return 'A.I. BitBots';
                        case 'ai_collabs_count': return 'A.I. Collabs';
                        default: return collection;
                      }
                    })();

                    const dailyYield = calculateCollectionYield(collection);

                    return (
                      <tr key={collection} className="border-t">
                        <td className="py-2">{displayName}</td>
                        <td className="text-center py-2">{count}</td>
                        <td className="text-center py-2">{dailyYield}</td>
                      </tr>
                    );
                  })}
                  {/* Add Monster Top 10 row */}
                  {(userData.collections.money_monsters_top_10 > 0 || userData.collections.money_monsters_3d_top_10 > 0) && (
                    <tr className="border-t">
                      <td className="py-2">Monster - Top 10</td>
                      <td className="text-center py-2">
                        {userData.collections.money_monsters_top_10 + userData.collections.money_monsters_3d_top_10}
                      </td>
                      <td className="text-center py-2">{calculateTop10Yield()}</td>
                    </tr>
                  )}
                  {/* Add Branded Cats row */}
                  {userData.collections.branded_catz_count > 0 && (
                    <tr className="border-t">
                      <td className="py-2">Cat - branded merch</td>
                      <td className="text-center py-2">{userData.collections.branded_catz_count}</td>
                      <td className="text-center py-2">{calculateBrandedCatzYield()}</td>
                    </tr>
                  )}
                  <tr className="font-semibold">
                    <td className="py-2 text-fuchsia-300">Total</td>
                    <td className="py-2 text-fuchsia-300 text-center">{userData.totalCount}</td>
                    <td className="py-2 text-fuchsia-300 text-center">{totalDailyYield}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Roles Display */}
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-lg p-6 shadow-lg backdrop-blur-sm border border-fuchsia-500/20">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <img src="/emojis/discord.svg" alt="" className="w-6 h-6" />
              My Roles
            </h3>
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
                  className="inline-flex items-center rounded px-2 py-1 bg-gray-800/80 hover:bg-gray-800 transition-colors"
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
                  <span className="text-sm font-medium text-white">
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
                {Number(userData?.balance || 0).toFixed(2)} $BUX
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