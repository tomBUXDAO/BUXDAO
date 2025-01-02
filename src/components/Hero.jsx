import { LockClosedIcon, ChartBarIcon, PhotoIcon, CircleStackIcon, WalletIcon, CurrencyDollarIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { DiscordIcon, PokerChipIcon } from './Icons';

const Hero = () => {
  const gifs = [
    '/gifs/bitbot.gif',
    '/gifs/catz.gif',
    '/gifs/celebs.gif',
    '/gifs/mm.gif',
    '/gifs/mm3d.gif'
  ];

  const GallerySection = () => {
    const gifSet = [...gifs, ...gifs, ...gifs, ...gifs];
    
    return (
      <div className="w-full bg-gray-950/80 border-t border-b border-gray-800">
        <div className="py-2 portrait:py-2 sm:py-6 overflow-hidden">
          <div className="relative">
            <div className="scroll-animation">
              {gifSet.map((gif, index) => (
                <div 
                  key={`gif-${index}`}
                  className="w-24 h-24 portrait:w-20 portrait:h-20 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 shadow-xl transform hover:scale-105 transition-transform duration-300"
                >
                  <img 
                    src={gif} 
                    alt={`BUXDAO NFT ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-gradient-to-b from-black to-purple-900">
      <div className="pt-20">
        {/* Gallery at top for mobile and tablet portrait */}
        <div className="block landscape:hidden md:hidden">
          <GallerySection />
        </div>

        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-8 sm:py-16">
          {/* Change to 2 columns on mobile landscape */}
          <div className="grid grid-cols-1 landscape:grid-cols-10 sm:grid-cols-10 gap-8">
            <div className="landscape:col-span-7 sm:col-span-7 sm:pr-8 landscape:flex landscape:flex-col landscape:justify-between landscape:gap-8">
              <div className="landscape:flex landscape:flex-col landscape:gap-8">
                <h1 className="text-3xl portrait:text-2xl landscape:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 landscape:mb-0 sm:mb-10 bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                  <span className="text-4xl portrait:text-3xl landscape:text-5xl sm:text-6xl md:text-7xl lg:text-8xl">BUXDAO</span> is a community owned NFT project, focused on providing passive income for holding members
                </h1>
                <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-300 mb-8 landscape:mb-0 sm:mb-10">
                  <span className="inline-flex items-center gap-6 px-6">
                    <ChartBarIcon className="h-20 w-20 landscape:h-16 landscape:w-16 sm:h-20 sm:w-20 text-white" />
                    100% REVENUE SHARE PAID OUT THROUGH DAILY TOKEN-BASED REWARDS
                  </span>
                </h2>
              </div>
              
              {/* Center button and text section */}
              <div className="flex flex-col items-center w-full lg:items-start">
                <div className="flex portrait:flex-col landscape:flex-row items-center gap-4 w-full portrait:max-w-sm portrait:mx-auto">
                  <button className="flex items-center justify-center space-x-3 bg-[#5865F2] px-8 py-3 rounded-full text-white text-base sm:text-lg hover:opacity-90 transition-opacity border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] whitespace-nowrap w-full">
                    <DiscordIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span>Holder verify</span>
                  </button>
                  <button className="flex items-center justify-center space-x-3 bg-transparent px-8 py-3 rounded-full text-white text-base sm:text-lg hover:bg-white/10 transition-all border-2 border-white whitespace-nowrap w-full">
                    <span>Learn more</span>
                    <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
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
                  <h3 className="text-yellow-400 font-semibold text-sm">Unlock Content</h3>
                  <p className="text-gray-300 text-xs">Connect your discord profile and wallet</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="bg-white/10 p-2 rounded-xl">
                  <CircleStackIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm">Daily Rewards</h3>
                  <p className="text-gray-300 text-xs">Paid out based on unlisted NFT holdings</p>
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
                  <PokerChipIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-yellow-400 font-semibold text-sm">Community Poker</h3>
                  <p className="text-gray-300 text-xs">Play for free to win NFT and $BUX prizes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Gallery at bottom for landscape and desktop */}
        <div className="hidden landscape:block md:block">
          <GallerySection />
        </div>
      </div>
    </section>
  );
};

export default Hero; 