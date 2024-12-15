import { LockClosedIcon, ChartBarIcon, PhotoIcon, CircleStackIcon, WalletIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { DiscordIcon } from './Icons';

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
      {/* Gallery at top for mobile */}
      <div className="block sm:hidden">
        <GallerySection />
      </div>

      {/* Main content - update padding to match header */}
      <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-8 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
          {/* Text and buttons */}
          <div className="lg:col-span-7 lg:pr-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
              BUXDAO is a community owned NFT project focused on providing passive income for holding members
            </h1>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-gray-300 mb-4 sm:mb-6">
              <span className="inline-flex items-center gap-4">
                <ChartBarIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                100% revenue share paid out through daily token-based rewards
              </span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-300 mb-8 sm:mb-10">
              <span className="inline-flex items-center gap-4">
                <WalletIcon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                Holder verify to be autoassigned holder based roles in our discord server and start earning rewards
              </span>
            </p>
            <div className="flex items-center justify-center">
              <button className="flex items-center justify-center space-x-3 bg-[#5865F2] px-12 py-3 rounded-full text-white text-base sm:text-lg hover:opacity-90 transition-opacity border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <DiscordIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span>Holder verify</span>
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

      {/* Gallery at bottom for tablet/desktop */}
      <div className="hidden sm:block">
        <GallerySection />
      </div>
    </section>
  );
};

export default Hero; 