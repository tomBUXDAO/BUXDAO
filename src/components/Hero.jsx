import { LockClosedIcon, ChartBarIcon, PhotoIcon, CircleStackIcon, WalletIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { DiscordIcon } from './Icons';
import { useState } from 'react';

const Hero = () => {
  const [gifsLoaded, setGifsLoaded] = useState(0);
  const totalGifs = gifs.length * 2; // Original + duplicate set

  const handleGifLoad = () => {
    setGifsLoaded(prev => prev + 1);
  };

  const gifs = [
    '/gifs/bitbot.gif',
    '/gifs/catz.gif',
    '/gifs/celebs.gif',
    '/gifs/mm.gif',
    '/gifs/mm3d.gif'
  ];

  const GallerySection = () => (
    <div className="w-full bg-gray-950/80 border-t border-b border-gray-800">
      <div className="py-4 sm:py-6 overflow-hidden">
        <div className="relative">
          <div className={`flex animate-scroll ${gifsLoaded < totalGifs ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`}>
            {/* Original set */}
            {gifs.map((gif, index) => (
              <div 
                key={`original-${index}`}
                className="w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 shadow-xl transform hover:scale-105 transition-transform duration-300 mx-2 sm:mx-3"
              >
                <img 
                  src={gif} 
                  alt={`BUXDAO NFT ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  onLoad={handleGifLoad}
                />
              </div>
            ))}
            {/* Duplicate set */}
            {gifs.map((gif, index) => (
              <div 
                key={`duplicate-${index}`}
                className="w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 shadow-xl transform hover:scale-105 transition-transform duration-300 mx-2 sm:mx-3"
              >
                <img 
                  src={gif} 
                  alt={`BUXDAO NFT ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  onLoad={handleGifLoad}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="bg-gradient-to-b from-black to-purple-900">
      <div className="pt-20">
        {/* Gallery at top only for mobile portrait */}
        <div className="block landscape:hidden sm:hidden">
          <GallerySection />
        </div>

        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-8 sm:py-16">
          {/* Change to 2 columns on mobile landscape */}
          <div className="grid grid-cols-1 landscape:grid-cols-10 sm:grid-cols-10 gap-8">
            <div className="landscape:col-span-7 sm:col-span-7 sm:pr-8 landscape:flex landscape:flex-col landscape:justify-between landscape:gap-8">
              <div className="landscape:flex landscape:flex-col landscape:gap-8">
                <h1 className="text-3xl landscape:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 landscape:mb-0 sm:mb-10 bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                  BUXDAO is a community owned NFT project focused on providing passive income for holding members
                </h1>
                <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-normal italic text-gray-300 mb-8 landscape:mb-0 sm:mb-10">
                  <span className="inline-flex items-center gap-4">
                    <ChartBarIcon className="h-10 w-10 landscape:h-8 landscape:w-8 sm:h-10 sm:w-10 text-white" />
                    100% revenue share paid out through daily token-based rewards
                  </span>
                </h2>
              </div>
              
              {/* Center button and text section */}
              <div className="flex flex-col items-center w-full lg:items-center">
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="flex flex-col items-center w-full gap-4">
                    <button className="flex items-center justify-center space-x-3 bg-[#5865F2] px-8 py-3 rounded-full text-white text-base sm:text-lg hover:opacity-90 transition-opacity border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] whitespace-nowrap">
                      <DiscordIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                      <span>Holder verify</span>
                    </button>
                    <p className="text-xs sm:text-base md:text-lg lg:text-xl text-gray-300 text-center whitespace-nowrap">
                      to get your discord roles and start earning rewards
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Icons grid */}
            <div className="landscape:col-span-3 sm:col-span-3 grid grid-cols-2 landscape:grid-cols-1 sm:grid-cols-1 gap-4 sm:gap-6 landscape:h-full landscape:justify-center">
              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <LockClosedIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm">Community Driven</h3>
                  <p className="text-gray-300 text-xs">Unlock holder only content</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <CurrencyDollarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm">Daily BUX Rewards</h3>
                  <p className="text-gray-300 text-xs">Link Discord & wallet to claim</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <PhotoIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm">Unique Art</h3>
                  <p className="text-gray-300 text-xs">Trade on the Solana blockchain</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <CircleStackIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm">Community Poker</h3>
                  <p className="text-gray-300 text-xs">Win NFT and $BUX prizes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery at bottom for landscape and larger */}
        <div className="hidden landscape:block">
          <GallerySection />
        </div>
      </div>
    </section>
  );
};

export default Hero; 