import { useState, useEffect } from 'react';
import { CurrencyDollarIcon, TrophyIcon, ChatBubbleLeftRightIcon, CogIcon, UserIcon, UsersIcon, StarIcon, LockClosedIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const Spades = () => {
  const [showBadge, setShowBadge] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
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

  const screenshots = [
    { src: '/lobby.png', alt: 'Lobby' },
    { src: '/game.table.png', alt: 'Game table' }
  ];

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center pt-24 pb-12">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="flex flex-row items-center justify-center gap-2 min-w-0 overflow-x-auto">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 py-2 sm:py-6 overflow-visible truncate whitespace-nowrap" style={{ fontFamily: "'Pacifico', cursive" }}>
              www.bux-spades.pro
            </h1>
            <a
              href="https://www.bux-spades.pro/"
              className={`ml-2 sm:ml-4 px-3 py-1 sm:px-5 sm:py-2 bg-yellow-400 text-black font-bold text-[10px] sm:text-base rounded-full inline-flex items-center justify-center mt-0 transition-opacity duration-700 shrink-0 whitespace-nowrap ${showBadge ? 'opacity-100' : 'opacity-0'}`}
            >
              Play&nbsp;Now
            </a>
          </div>
          <div className="mt-6">
            <p className="text-2xl sm:text-3xl font-bold text-white mb-2">Get ready for BUX Spades, the ultimate spades platform.</p>
            <p className="text-md text-gray-300 max-w-2xl mx-auto">Play with friends, win coins in a fun and competitive online card game experience with unique and customisable game rules.</p>
          </div>
          <p className="text-lg text-yellow-400 mt-6 mb-2 font-semibold text-center w-full">5mil FREE coins for new members</p>
        </div>

        {/* Content: Screenshots and Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Screenshots - Left Column */}
          <div className="md:col-span-2 order-1 md:order-1 text-center h-full flex flex-col justify-center">
            <div className="bg-gray-900 rounded-xl p-3 shadow-lg border border-purple-700 mx-auto max-w-md md:max-w-none h-full flex flex-col justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {screenshots.map((shot) => (
                  <div key={shot.src} className="relative group cursor-pointer" onClick={() => setLightboxSrc(shot.src)}>
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      className="w-full h-full object-cover rounded-lg transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 rounded-lg ring-1 ring-purple-500/40 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features List - Right Column */}
          <div className="md:col-span-1 order-2 md:order-2 h-full flex items-center">
            <div className="bg-gray-900 rounded-xl p-5 w-full shadow-lg border border-purple-700 h-full flex flex-col justify-center">
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-5 text-left">Game Features</h3>
              <ul className="space-y-1.5 text-[11px] sm:text-xs text-left">
                {features.map((feature) => (
                  <li key={feature.title} className="flex items-start text-gray-300">
                    <feature.icon className="h-3 w-3 text-purple-400 mt-0.5 mr-2 flex-shrink-0" />
                    <span>{feature.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setLightboxSrc(null)}>
          <img src={lightboxSrc} alt="Preview" className="max-w-[95vw] max-h-[90vh] rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

export default Spades; 