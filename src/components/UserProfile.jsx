import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useWallet } from '@solana/wallet-adapter-react';
import { API_BASE_URL } from '../config';
import { toast } from 'react-hot-toast';
import { Connection, Transaction } from '@solana/web3.js';
import BuxClaimButton from './BuxClaimButton';

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
  const wallet = useWallet();
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
  const [claimAmount, setClaimAmount] = useState('');
  const [timeUntilUpdate, setTimeUntilUpdate] = useState(0);
  const [isClaimLoading, setIsClaimLoading] = useState(false);

  // Format time remaining
  const formatTimeRemaining = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Update timer every second
  useEffect(() => {
    const calculateNextUpdate = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      return tomorrow - now;
    };

    // Initial calculation
    setTimeUntilUpdate(calculateNextUpdate());

    // Update every second
    const timer = setInterval(() => {
      const timeLeft = calculateNextUpdate();
      setTimeUntilUpdate(timeLeft);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!discordUser?.discord_id) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Fetch collection counts and claim account data
        const [collectionCountsResponse, claimAccountResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/collection-counts/${discordUser.discord_id}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            }
          }),
          fetch(`${API_BASE_URL}/api/user/balance`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Origin': window.location.origin
            }
          })
        ]);

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

          // Get claim account data
          const claimData = await claimAccountResponse.json();
          console.log('Claim account data:', claimData);

          // Update state with collection and claim data
          setUserData(prev => ({
            ...prev,
            collections: collectionCounts,
            totalCount: collectionData.total_count || 0,
            balance: collectionData.balance || 0,
            unclaimed_rewards: claimData.unclaimed_amount || 0
          }));
        }

        // Now fetch roles
        const rolesResponse = await fetch(`${API_BASE_URL}/api/auth/roles`, {
          credentials: 'include',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Origin': window.location.origin
          }
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

  // Listen for balance updates
  useEffect(() => {
    const handleBalanceUpdate = (event) => {
      setUserData(prev => ({
        ...prev,
        balance: parseFloat(event.detail.newBalance),
        unclaimed_rewards: parseFloat(event.detail.unclaimedAmount)
      }));
    };

    window.addEventListener('bux:balanceUpdated', handleBalanceUpdate);
    return () => window.removeEventListener('bux:balanceUpdated', handleBalanceUpdate);
  }, []);

  // Calculate collection yield
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

  // Calculate total daily yield
  const totalDailyYield = Object.keys(DAILY_REWARDS).reduce(
    (total, collection) => total + calculateCollectionYield(collection),
    0
  ) + calculateTop10Yield() + calculateBrandedCatzYield();

  const handleClaimRewards = async () => {
    if (!wallet.connected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!claimAmount || claimAmount <= 0) {
      toast.error('Please enter a valid amount to claim');
      return;
    }

    if (claimAmount > userData.unclaimed_rewards) {
      toast.error('Insufficient unclaimed balance');
      return;
    }

    setIsClaimLoading(true);
    try {
      // Start claim process
      const claimResponse = await fetch(`${API_BASE_URL}/api/user/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ amount: parseInt(claimAmount) })
      });

      if (!claimResponse.ok) {
        const error = await claimResponse.json();
        toast.error(error.error || 'Failed to initiate claim');
        return;
      }

      const { transaction: serializedTx, txId } = await claimResponse.json();

      // Request wallet signature
      try {
        const tx = Transaction.from(Buffer.from(serializedTx, 'base64'));
        
        // Sign transaction
        const signedTx = await wallet.signTransaction(tx);
        if (!signedTx) {
          throw new Error('Failed to sign transaction');
        }

        // Send transaction
        const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
        const signature = await connection.sendRawTransaction(
          signedTx.serialize()
        );

        // Wait for confirmation
        toast.loading('Confirming transaction...', { id: 'confirm-tx' });
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error('Transaction failed');
        }

        // Confirm with backend
        const confirmResponse = await fetch(`${API_BASE_URL}/api/user/claim/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ txId, signature })
        });

        if (!confirmResponse.ok) {
          const error = await confirmResponse.json();
          toast.error(error.error || 'Failed to confirm claim');
          return;
        }

        // Success! Update UI
        setUserData(prev => ({
          ...prev,
          unclaimed_rewards: prev.unclaimed_rewards - parseInt(claimAmount),
          balance: prev.balance + parseInt(claimAmount)
        }));

        toast.success('Successfully claimed rewards!');
        setClaimAmount(''); // Reset input
        toast.dismiss('confirm-tx');

      } catch (error) {
        console.error('Transaction error:', error);
        toast.error(error.message || 'Failed to process transaction');
        toast.dismiss('confirm-tx');
      }

    } catch (error) {
      console.error('Claim error:', error);
      toast.error('Failed to process claim');
    } finally {
      setIsClaimLoading(false);
    }
  };

  const handleCashout = async () => {
    // TODO: Implement cashout functionality
    console.log('Processing cashout:', cashoutAmount);
  };

  // Add handlers for max and 50% buttons
  const handleMaxClaim = () => {
    setClaimAmount(userData?.unclaimed_rewards || 0);
  };

  const handle50Claim = () => {
    setClaimAmount((userData?.unclaimed_rewards || 0) / 2);
  };

  const handleMaxCashout = () => {
    setCashoutAmount(userData?.balance || 0);
  };

  const handle50Cashout = () => {
    setCashoutAmount((userData?.balance || 0) / 2);
  };

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
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-6 h-6" fill="white" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path d="M 21 4 C 19.207031 4 17.582031 4.335938 16.3125 4.96875 C 15.042969 5.601563 14 6.632813 14 8 L 14 12 C 14 12.128906 14.042969 12.253906 14.0625 12.375 C 13.132813 12.132813 12.101563 12 11 12 C 9.207031 12 7.582031 12.335938 6.3125 12.96875 C 5.042969 13.601563 4 14.632813 4 16 L 4 24 C 4 25.367188 5.042969 26.398438 6.3125 27.03125 C 7.582031 27.664063 9.207031 28 11 28 C 12.792969 28 14.417969 27.664063 15.6875 27.03125 C 16.957031 26.398438 18 25.367188 18 24 L 18 23.59375 C 18.917969 23.835938 19.921875 24 21 24 C 22.792969 24 24.417969 23.664063 25.6875 23.03125 C 26.957031 22.398438 28 21.367188 28 20 L 28 8 C 28 6.632813 26.957031 5.601563 25.6875 4.96875 C 24.417969 4.335938 22.792969 4 21 4 Z M 21 6 C 22.523438 6 23.878906 6.328125 24.78125 6.78125 C 25.683594 7.234375 26 7.710938 26 8 C 26 8.289063 25.683594 8.765625 24.78125 9.21875 C 23.878906 9.671875 22.523438 10 21 10 C 19.476563 10 18.121094 9.671875 17.21875 9.21875 C 16.316406 8.765625 16 8.289063 16 8 C 16 7.710938 16.316406 7.234375 17.21875 6.78125 C 18.121094 6.328125 19.476563 6 21 6 Z M 16 10.84375 C 16.105469 10.902344 16.203125 10.976563 16.3125 11.03125 C 17.582031 11.664063 19.207031 12 21 12 C 22.792969 12 24.417969 11.664063 25.6875 11.03125 C 25.796875 10.976563 25.894531 10.902344 26 10.84375 L 26 12 C 26 12.289063 25.683594 12.765625 24.78125 13.21875 C 23.878906 13.671875 22.523438 14 21 14 C 19.476563 14 18.121094 13.671875 17.21875 13.21875 C 16.316406 12.765625 16 12.289063 16 12 Z M 11 14 C 12.523438 14 13.878906 14.328125 14.78125 14.78125 C 15.683594 15.234375 16 15.710938 16 16 C 16 16.289063 15.683594 16.765625 14.78125 17.21875 C 13.878906 17.671875 12.523438 18 11 18 C 9.476563 18 8.121094 17.671875 7.21875 17.21875 C 6.316406 16.765625 6 16.289063 6 16 C 6 15.710938 6.316406 15.234375 7.21875 14.78125 C 8.121094 14.328125 9.476563 14 11 14 Z M 26 14.84375 L 26 16 C 26 16.289063 25.683594 16.765625 24.78125 17.21875 C 23.878906 17.671875 22.523438 18 21 18 C 19.863281 18 18.835938 17.8125 18 17.53125 L 18 16 C 18 15.871094 17.957031 15.746094 17.9375 15.625 C 18.867188 15.867188 19.898438 16 21 16 C 22.792969 16 24.417969 15.664063 25.6875 15.03125 C 25.796875 14.976563 25.894531 14.902344 26 14.84375 Z M 6 18.84375 C 6.105469 18.902344 6.203125 18.976563 6.3125 19.03125 C 7.582031 19.664063 9.207031 20 11 20 C 12.792969 20 14.417969 19.664063 15.6875 19.03125 C 15.796875 18.976563 15.894531 18.902344 16 18.84375 L 16 20 C 16 20.289063 15.683594 20.765625 14.78125 21.21875 C 13.878906 21.671875 12.523438 22 11 22 C 9.476563 22 8.121094 21.671875 7.21875 21.21875 C 6.316406 20.765625 6 20.289063 6 20 Z M 26 18.84375 L 26 20 C 26 20.289063 25.683594 20.765625 24.78125 21.21875 C 23.878906 21.671875 22.523438 22 21 22 C 19.863281 22 18.835938 21.839844 18 21.5625 L 18 19.625 C 18.917969 19.867188 19.917969 20 21 20 C 22.792969 20 24.417969 19.664063 25.6875 19.03125 C 25.796875 18.976563 25.894531 18.902344 26 18.84375 Z M 6 22.84375 C 6.105469 22.902344 6.203125 22.976563 6.3125 23.03125 C 7.582031 23.664063 9.207031 24 11 24 C 12.792969 24 14.417969 23.664063 15.6875 23.03125 C 15.796875 22.976563 15.894531 22.902344 16 22.84375 L 16 24 C 16 24.289063 15.683594 24.765625 14.78125 25.21875 C 13.878906 25.671875 12.523438 26 11 26 C 9.476563 26 8.121094 25.671875 7.21875 25.21875 C 6.316406 24.765625 6 24.289063 6 24 Z" />
              </svg>
              Claim & Cashout
            </h3>
            
            {/* Timer and Unclaimed Rewards */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-fuchsia-300">Unclaimed Rewards</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-400">Updates in:</p>
                  <div className="bg-gray-900 px-3 py-1 rounded font-mono text-lg text-white">
                    {formatTimeRemaining(timeUntilUpdate)}
                  </div>
                </div>
              </div>
              
              <p className="text-2xl font-bold text-white mb-3">
                {Number(userData?.unclaimed_rewards || 0).toFixed(2)} $BUX
              </p>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={claimAmount}
                    onChange={(e) => setClaimAmount(e.target.value)}
                    placeholder="Enter amount to claim"
                    disabled={true}
                    className="w-full p-2 border-2 border-white/20 rounded-lg bg-gray-900/50 
                             text-white placeholder-gray-400 focus:outline-none 
                             focus:border-white/40 shadow-inner disabled:opacity-50"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                    <button 
                      onClick={handle50Claim}
                      disabled={true}
                      className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700 
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      50%
                    </button>
                    <button 
                      onClick={handleMaxClaim}
                      disabled={true}
                      className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700
                               disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <button
                  disabled={true}
                  className="w-full py-3 px-4 rounded-lg font-bold border-2 border-white/90 
                            relative overflow-hidden transition-all duration-300
                            disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#c0c0c0,#e0e0e0,#c0c0c0)]" />
                  <div className="relative z-10 text-white uppercase tracking-[0.15em] font-black 
                                [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]">
                    CLAIM FUNCTION COMING SOON
                  </div>
                </button>
                <p className="text-sm text-center text-fuchsia-300">
                  The claim function is currently being tested and will be available soon!
                </p>
              </div>
            </div>

            {/* Cashout Section */}
            <div>
              <p className="text-fuchsia-300 mb-2">BUX Balance</p>
              <p className="text-2xl font-bold text-white mb-3">
                {Number(userData?.balance || 0).toFixed(2)} $BUX
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="number"
                    value={cashoutAmount}
                    onChange={(e) => setCashoutAmount(e.target.value)}
                    placeholder="Enter amount to cashout"
                    className="w-full p-2 border-2 border-white/20 rounded-lg bg-gray-900/50 
                             text-white placeholder-gray-400 focus:outline-none 
                             focus:border-white/40 shadow-inner"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                    <button 
                      onClick={handle50Cashout}
                      className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700"
                    >
                      50%
                    </button>
                    <button 
                      onClick={handleMaxCashout}
                      className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <p className="text-sm text-fuchsia-300">
                  Value: {(cashoutAmount * 0.00001).toFixed(6)} SOL
                </p>
                <div className="relative">
                  <button
                    onClick={handleCashout}
                    className="w-full py-3 px-4 rounded-lg font-bold border-2 border-white/90
                              relative overflow-hidden
                              transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffd700,#faf0be,#ffd700)]
                                  hover:bg-[linear-gradient(to_right,#ffed4a,#faf0be,#ffed4a)]" />
                    <div className="relative z-10 text-white uppercase tracking-[0.15em] font-black [text-shadow:_-1px_-1px_0_#000,_1px_-1px_0_#000,_-1px_1px_0_#000,_1px_1px_0_#000]">
                      CASHOUT
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 