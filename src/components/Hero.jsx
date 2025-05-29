import { LockClosedIcon, ChartBarIcon, PhotoIcon, CircleStackIcon, WalletIcon, CurrencyDollarIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { DiscordIcon, PokerChipIcon } from './Icons';
import { Link } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import UserStats from './UserStats';

const featureCards = [
  {
    icon: <LockClosedIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />, 
    title: 'Unlock Content',
    desc: 'Connect your discord profile and wallet',
  },
  {
    icon: <CircleStackIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />, 
    title: 'Daily Rewards',
    desc: 'Paid out based on unlisted NFT holdings',
  },
  {
    icon: <PhotoIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />, 
    title: 'Unique Art',
    desc: 'Trade on the Solana blockchain',
  },
  {
    icon: <PokerChipIcon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />, 
    title: 'Community Poker',
    desc: 'Play for free to win NFT and $BUX prizes',
  },
];

const Hero = () => {
  const { discordUser } = useUser();

  const gifs = [
    '/gifs/mm.gif',
    '/gifs/catz.gif',
    '/gifs/bitbot.gif',
    '/gifs/mm3d.gif',
    '/gifs/celebs.gif'
  ];

  const GallerySection = () => {
    const gifSet = [...gifs, ...gifs, ...gifs, ...gifs];
    
    return (
      <div className="w-full bg-gray-950/80 border-t border-b border-gray-800">
        <div className="py-4 portrait:py-4 sm:py-8 md:py-10 lg:py-12 overflow-hidden">
          <div className="relative">
            <div className="scroll-animation">
              {gifSet.map((gif, index) => (
                <div 
                  key={`gif-${index}`}
                  className="w-24 h-24 portrait:sm:w-48 portrait:sm:h-48 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 shadow-xl transform hover:scale-105 transition-transform duration-300"
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
    <section className="bg-gradient-to-b from-black to-purple-900 pt-10 sm:pt-6">
      <div className="pt-6">
        {/* Gallery at top for mobile and tablet portrait */}
        <div className="block landscape:hidden lg:hidden">
          <GallerySection />
        </div>

        <div className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-8 sm:py-16">
          {/* Change to 2 columns on mobile landscape */}
          <div className="grid grid-cols-1 landscape:grid-cols-10 sm:grid-cols-10 gap-8">
            <div className="landscape:col-span-7 sm:col-span-7 sm:pr-8 landscape:flex landscape:flex-col landscape:justify-between landscape:gap-8">
              <div className="landscape:flex landscape:flex-col landscape:gap-8">
                <h1 className="text-3xl portrait:text-2xl landscape:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-8 landscape:mb-0 sm:mb-10 bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                  BUXDAO is a community owned NFT project, focused on providing passive income for holding members
                </h1>
                <div className="text-xs sm:text-sm text-gray-200 font-normal mb-8 landscape:mb-0 sm:mb-10">
                  <ul className="list-disc list-outside pl-5 space-y-2">
                    <li>Collect NFTs from our digital art collections</li>
                    <li>Connect your discord profile and wallet using the "holder verify" button below</li>
                    <li>Automatically start receiving daily rewards paid out in our $BUX token</li>
                    <li>Claim the tokens you earn for all NFTs in a single low cost transaction</li>
                    <li>Cashout your $BUX tokens for Solana from our community wallet (coming soon)</li>
                  </ul>
                </div>
              </div>

              {/* Center button and text section */}
              <div className="flex flex-col items-center w-full lg:items-start mt-8">
                {discordUser ? (
                  <div className="w-full">
                    <UserStats />
                  </div>
                ) : (
                  <div className="flex portrait:flex-col landscape:flex-row items-center gap-4 w-full portrait:max-w-sm portrait:mx-auto">
                    <Link to="/verify" className="w-full">
                      <button className="flex items-center justify-center space-x-3 bg-[#5865F2] px-8 py-3 rounded-full text-white text-base sm:text-lg hover:opacity-90 transition-opacity border-2 border-white shadow-[0_0_15px_rgba(0,0,0,0.5)] whitespace-nowrap w-full">
                        <DiscordIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span>Holder verify</span>
                      </button>
                    </Link>
                    <Link to="/bux" className="w-full">
                      <button className="flex items-center justify-center space-x-3 bg-transparent px-8 py-3 rounded-full text-white text-base sm:text-lg hover:bg-white/10 transition-all border-2 border-white whitespace-nowrap w-full">
                        <span>Learn more</span>
                        <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Icons grid */}
            <div className="landscape:col-span-3 sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 landscape:grid-cols-1 gap-4 sm:gap-6 landscape:h-full landscape:justify-center">
              {featureCards.map((card) => (
                <div
                  key={card.title}
                  className="flex items-center space-x-3 group transition-all duration-200 hover:bg-white/10 hover:shadow-lg hover:scale-[1.03] rounded-2xl cursor-default px-5 py-4 border border-white/10 backdrop-blur-sm"
                >
                  <div className="bg-white/10 p-2 rounded-xl transition-all duration-200 group-hover:bg-white/20">
                    {card.icon}
                  </div>
                  <div>
                    <h3 className="text-yellow-400 font-semibold text-sm">{card.title}</h3>
                    <p className="text-gray-300 text-xs">{card.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gallery at bottom for landscape and desktop */}
        <div className="hidden landscape:block lg:block">
          <GallerySection />
        </div>
      </div>
    </section>
  );
};

export default Hero; 