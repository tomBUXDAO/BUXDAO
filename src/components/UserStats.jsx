import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';

export default function UserStats() {
  const { discordUser } = useUser();
  const [userStats, setUserStats] = useState({ rank: '-', bux: '-', nfts: '-', username: '-' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUserStats() {
      if (!discordUser?.discord_username) return;

      setLoading(true);
      try {
        const response = await fetch('/api/top-holders?type=bux,nfts', {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // Try to match by discord_username or wallet address
        const userHolder = data.holders.find(holder => 
          holder.discord_username === discordUser.discord_username ||
          holder.address === discordUser.discord_username ||
          holder.address === discordUser.wallet_address
        );

        if (userHolder) {
          const rank = data.holders.indexOf(userHolder) + 1;
          setUserStats({
            rank: rank.toString(),
            bux: userHolder.bux,
            nfts: userHolder.nfts,
            username: userHolder.discord_username || discordUser.discord_username || userHolder.address
          });
          setError(null);
        } else {
          setUserStats({
            rank: '-',
            bux: 0,
            nfts: 0,
            username: discordUser.discord_username || '-'
          });
          setError(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUserStats();
  }, [discordUser?.discord_username, discordUser?.wallet_address]);

  const getRankDisplay = (rank) => {
    const rankNum = parseInt(rank);
    if (rankNum === 1) return <span title="1st Place" className="text-yellow-500 text-6xl">🥇</span>;
    if (rankNum === 2) return <span title="2nd Place" className="text-gray-300 text-6xl">🥈</span>;
    if (rankNum === 3) return <span title="3rd Place" className="text-amber-600 text-6xl">🥉</span>;
    if (rankNum > 3 && rankNum < 10) return <span title={`Top 10`} className="text-yellow-500 text-6xl">⭐</span>;
    if (rankNum >= 10 && rankNum < 25) return <span title={`Top 25`} className="text-gray-300 text-6xl">⭐</span>;
    return <span title={`Rank ${rankNum}`} className="text-amber-600 text-6xl">●</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-4 bg-gradient-to-r from-black/40 to-transparent border border-white/20 rounded-lg py-4 pl-4 pr-8 max-w-2xl">
        <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
        <div className="flex flex-1 portrait:max-sm:flex-col portrait:max-sm:gap-2 portrait:max-sm:justify-center">
          <div className="flex items-center portrait:max-sm:justify-center gap-3">
            <div className="w-14 h-14 bg-gray-700 rounded-full"></div>
            <div className="h-5 bg-gray-700 rounded w-32"></div>
          </div>
          <div className="h-5 bg-gray-700 rounded w-24 portrait:max-sm:mx-auto ml-auto self-center"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // No error message, just show the summary with zeros if not found
  }

  return (
    <div className="flex items-center gap-8 bg-gradient-to-r from-black/40 to-transparent border border-white/20 rounded-lg py-4 pl-4 pr-8 max-w-2xl">
      {/* Rank column */}
      <div className="flex flex-col items-center justify-center w-20">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 flex items-center justify-center">
            {getRankDisplay(userStats.rank)}
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-black text-2xl font-bold">{userStats.rank}</span>
          </div>
        </div>
      </div>
      {/* Username column (avatar + username inline) */}
      <div className="flex items-center justify-center w-64">
        {discordUser?.discord_id && discordUser?.avatar && (
          <img 
            src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
            alt={userStats.username}
            className="w-14 h-14 rounded-full mr-3"
          />
        )}
        <span className="text-gray-200 text-lg font-bold">{userStats.username}</span>
      </div>
      {/* Stats column (right-justified) */}
      <div className="flex flex-col items-end justify-center w-40 ml-auto">
        <ul className="list-none p-0 m-0 space-y-1 text-right">
          <li className="text-fuchsia-400 font-bold text-lg">{String(userStats.nfts).replace(/\s*NFTs?\s*$/, '')} NFTs</li>
          <li className="text-purple-400 font-bold text-lg">{userStats.bux} BUX</li>
        </ul>
      </div>
    </div>
  );
} 