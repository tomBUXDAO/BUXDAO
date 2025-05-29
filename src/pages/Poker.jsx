import { useState, useEffect } from 'react';
import { TrophyIcon } from '@heroicons/react/24/outline';
import { FaDiscord, FaWallet, FaCrown, FaListOl } from 'react-icons/fa';

const Poker = () => {
  const [showBadge, setShowBadge] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowBadge(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center pt-24 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center gap-2 min-w-0 overflow-x-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 py-2 sm:py-6 overflow-visible truncate whitespace-nowrap" style={{ fontFamily: "'Pacifico', cursive" }}>
              www.bux-poker.pro
            </h1>
            <span className={`ml-2 sm:ml-4 px-2 py-1 min-w-[64px] sm:px-4 sm:py-2 sm:min-w-[90px] bg-yellow-400 text-black font-bold text-[10px] sm:text-base rounded-full inline-flex flex-col items-center justify-center align-middle mt-0 text-center transition-opacity duration-700 shrink-0 whitespace-nowrap ${showBadge ? 'opacity-100' : 'opacity-0'}`} style={{ lineHeight: '1.1' }}>
              Coming<br />Soon
            </span>
          </div>
          <div className="mt-6">
            <img src="/poker-play.jpg" alt="BUX Poker gameplay screenshot" className="rounded-xl shadow-lg border border-purple-700 mx-auto mb-6 max-w-full" />
            <p className="text-md sm:text-lg text-gray-100 max-w-2xl mx-auto mb-6 font-bold">BUX Poker is a Web3 tournament platform with discord integration.</p>
            <div className="bg-gray-900/80 border border-purple-700 rounded-xl p-5 max-w-xl mx-auto mb-6 shadow-lg">
              <ul className="text-left text-gray-200 space-y-5 text-sm sm:text-base">
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-[#5865F2]"><FaDiscord size={20} /></span>
                  <span><span className="font-semibold text-yellow-400">Holder-Only Tournaments via Discord:</span> All registration happens inside gated Discord channels, and only members with a verified holder role can see and enter. If you hold the NFT, you've already got access — just hit the button to register.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-green-400"><FaWallet size={20} /></span>
                  <span><span className="font-semibold text-yellow-400">Wallet-Synced Prizes:</span> Our system links your Discord to your wallet using the website's holder database. That means when you win, your prizes are sent automatically — no claiming, no gas fees.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 text-pink-400"><FaListOl size={20} /></span>
                  <span><span className="font-semibold text-yellow-400">The BUX Leaderboard: Play Daily, Win Monthly:</span> Leaderboard games run every Sunday to Thursday, and each season ends after 20 games. Earn points based on performance, and the top players each month win exclusive NFTs and $BUX tokens.</span>
                </li>
              </ul>
            </div>
            <p className="text-lg text-pink-400 mt-8 mb-2 font-semibold text-center w-full flex items-center justify-center gap-2"><FaCrown className="inline-block text-yellow-400 mb-1" size={24} />Who will be the BUX Poker King?</p>
            <p className="text-md text-gray-300 mb-2">There can only be one. Stack your chips, climb the board, and take your crown.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Poker; 