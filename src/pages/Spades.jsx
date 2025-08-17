import { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon, CogIcon, UserIcon, UsersIcon, StarIcon, LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const Spades = () => {
  const [showBadge, setShowBadge] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowBadge(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Updated features list
  const features = [
    { icon: UserIcon, title: 'Login with Discord' },
    { icon: ChatBubbleLeftRightIcon, title: 'Integrated lobby and table chats' },
    { icon: UsersIcon, title: 'Create/join game tables' },
    { icon: StarIcon, title: 'View detailed player stats' },
    { icon: UserIcon, title: 'Add friends and block players' },
    { icon: CogIcon, title: 'Customise bidding and game rules' },
    { icon: ArrowPathIcon, title: 'Allow sub players if players disconnect' },
    { icon: LockClosedIcon, title: 'Link your FaceBook to unlock private league and tournament rooms' },
  ];

  return (
    <div className="bg-black min-h-screen pt-28 pb-16">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 py-2 sm:py-6 whitespace-nowrap" style={{ fontFamily: "'Pacifico', cursive" }}>
            www.bux-spades.pro
          </h1>
          <a
            href="https://www.bux-spades.pro/"
            className={`px-4 py-2 sm:px-6 sm:py-3 bg-yellow-400 text-black font-bold text-sm sm:text-base rounded-full inline-flex items-center justify-center transition-opacity duration-700 ${showBadge ? 'opacity-100' : 'opacity-0'}`}
          >
            Play&nbsp;Now
          </a>
        </div>
        <div className="mt-2">
          <p className="text-2xl sm:text-3xl font-bold text-white mb-2">Get ready for BUX Spades, the ultimate spades platform.</p>
          <p className="text-md text-gray-300 max-w-2xl mx-auto">Play with friends, win coins in a fun and competitive online card game experience with unique and customisable game rules.</p>
        </div>
        <p className="text-lg text-yellow-400 mt-6 mb-2 font-semibold text-center w-full">5mil FREE coins for new members</p>
      </div>

      {/* Content: Screenshots and Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Screenshots - Left Column (stacked) */}
          <div>
            <div className="flex flex-col items-center gap-8">
              <img
                src="/lobby.png"
                alt="Lobby"
                className="w-full rounded-xl shadow-xl ring-1 ring-purple-500/20 object-cover"
              />
              <img
                src="/game.table.png"
                alt="Game table"
                className="w-full rounded-xl shadow-xl ring-1 ring-purple-500/20 object-cover"
              />
            </div>
          </div>

          {/* Features List - Right Column */}
          <div>
            <div className="bg-gray-900 rounded-xl p-6 w-full shadow-lg border border-purple-700 h-full">
              <h3 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-5 text-left">Game Features</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm sm:text-base text-left">
                {features.map((feature) => (
                  <li key={feature.title} className="flex items-start text-gray-300">
                    <feature.icon className="h-5 w-5 text-purple-400 mt-0.5 mr-3 flex-shrink-0" />
                    <span>{feature.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Spades; 