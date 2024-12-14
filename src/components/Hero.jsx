import { LockClosedIcon, BanknotesIcon, PhotoIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import { DiscordIcon, MagicEdenIcon } from './Icons';

const Hero = () => {
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
          <div className="flex animate-scroll gap-4 sm:gap-6 md:gap-8 lg:gap-12 whitespace-nowrap">
            {[...gifs, ...gifs].map((gif, index) => (
              <div 
                key={index} 
                className="w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 shadow-xl transform hover:scale-105 transition-transform duration-300"
              >
                <img 
                  src={gif} 
                  alt={`BUXDAO NFT ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <section className="min-h-screen pt-20 bg-gradient-to-b from-black to-purple-900">
      {/* Gallery appears at top only in mobile portrait */}
      <div className="block sm:hidden">
        <GallerySection />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Text and buttons */}
          <div className="lg:col-span-7 lg:pr-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
              BUXDAO is a community owned enterprise focused on providing passive income for holding members
            </h1>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-300 mb-4 sm:mb-6">
              100% revenue share through daily tokenised rewards
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 mb-4 sm:mb-6">
              Connect your wallet and discord profile to be autoassigned holder based server roles and unlock holder-only content
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4 mb-8 lg:mb-0">
              <button className="flex items-center justify-center space-x-2 bg-[#5865F2] px-4 py-2 rounded-full text-white text-sm sm:text-base hover:opacity-90 transition-opacity">
                <DiscordIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Login with Discord</span>
              </button>
              <button className="border-2 border-white px-4 py-2 rounded-full text-white text-sm sm:text-base hover:bg-white hover:text-black transition-all text-center">
                Learn more about $BUX token
              </button>
            </div>
          </div>

          {/* Icons grid - 2x2 on mobile, vertical on desktop */}
          <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6">
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
                <BanknotesIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
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

      {/* Gallery appears at bottom in tablet and desktop */}
      <div className="hidden sm:block">
        <GallerySection />
      </div>
    </section>
  );
};

export default Hero; 