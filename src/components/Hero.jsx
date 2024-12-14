import { LockClosedIcon, BanknotesIcon, PhotoIcon, CircleStackIcon } from '@heroicons/react/24/outline';

const Hero = () => {
  const gifs = [
    '/gifs/bitbot.gif',
    '/gifs/catz.gif',
    '/gifs/celebs.gif',
    '/gifs/mm.gif',
    '/gifs/mm3d.gif'
  ];

  return (
    <section className="min-h-screen pt-20 bg-gradient-to-b from-black to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-10">
          <div className="col-span-7 pr-12">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-8">
              100% community owned and managed
            </h1>
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-300 mb-8">
              Focused on providing profitability for holders...
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Explore our unique digital artwork collections and join the future of digital collectibles.
            </p>
            <div className="flex space-x-4 mb-4">
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-3 rounded-full text-white text-lg hover:opacity-90 transition-opacity">
                Explore Collection
              </button>
              <button className="border-2 border-white px-8 py-3 rounded-full text-white text-lg hover:bg-white hover:text-black transition-all">
                Learn More
              </button>
            </div>
          </div>
          <div className="col-span-3 flex flex-col justify-center space-y-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-4 rounded-xl">
                <LockClosedIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-yellow-400 font-semibold">Community Driven</h3>
                <p className="text-gray-300 text-sm">Unlock holder only content</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-4 rounded-xl">
                <BanknotesIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-yellow-400 font-semibold">Daily BUX Rewards</h3>
                <p className="text-gray-300 text-sm">Link Discord & wallet to claim</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-4 rounded-xl">
                <PhotoIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-yellow-400 font-semibold">Unique Art</h3>
                <p className="text-gray-300 text-sm">Trade on the Solana blockchain</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-white/10 p-4 rounded-xl">
                <CircleStackIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-yellow-400 font-semibold">Community Poker</h3>
                <p className="text-gray-300 text-sm">Win NFT and $BUX prizes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrolling GIFs Section */}
      <div className="w-full bg-gray-950/80 border-t border-b border-gray-800">
        <div className="py-6 overflow-hidden">
          <div className="relative">
            <div className="flex animate-scroll gap-12 whitespace-nowrap">
              {[...gifs, ...gifs].map((gif, index) => (
                <div 
                  key={index} 
                  className="w-64 h-64 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 shadow-xl transform hover:scale-105 transition-transform duration-300"
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
    </section>
  );
};

export default Hero; 