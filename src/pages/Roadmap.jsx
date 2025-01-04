import { CalendarIcon, CurrencyDollarIcon, GiftIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const Roadmap = () => {
  const upcomingFeatures = [
    {
      title: 'SLOTTO.gg',
      description: 'Weekly prize draw with BIG Sol prizes and listings site featured only trusted and doxxed projects',
      icon: GiftIcon,
      date: 'Q1 2025',
      details: [
        'Purchase tickets with Sol or with tokens from any partner project',
        'Free promo for all partners',
        'SUPPORT PROJECTS YOU CAN TRUST',
        '2% weekly ticket sales added to $BUX liquidity pool'
      ]
    },
    {
      title: 'Spades',
      description: 'Multiplayer spades platform with token integration',
      icon: () => (
        <img 
          src="/suit-spade-svgrepo-com.svg"
          alt="Spades"
          className="h-6 w-6"
        />
      ),
      date: 'Q2 2025',
      details: [
        'Customisable game options',
        'Play for fun or in a league',
        'Tournaments with token prizes',
        'Private game rooms'
      ]
    },
    {
      title: 'Poker tournament Discord bot',
      description: 'Cross-community poker tournaments hosted by our in-house poker bot',
      icon: () => (
        <img 
          src="/poker-chip-thin-svgrepo-com.svg"
          alt="Poker"
          className="h-6 w-6"
        />
      ),
      date: 'Q3 2025',
      details: [
        'Play with your Discord profile',
        'Register in 1 click without leaving the server',
        'Launch in browser with no download',
        'Multi-server functionality'
      ]
    },
    {
      title: 'New Collection Launch',
      description: 'Brand new NFT collection with enhanced utility',
      icon: CalendarIcon,
      date: 'TBA',
      details: [
        'Unique artwork and traits',
        'Contributions from respected artists',
        'Next level daily rewards',
        '100% mint profits added to liquidity pool'
      ]
    }
  ];

  return (
    <div className="bg-black pt-20 pb-32">
      {/* Header Section */}
      <div className="bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 leading-tight pb-2">
            Coming Soon
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Exciting new features and developments are on the horizon.<br />Here's what you can expect in 2025 at BUXDAO.
          </p>
        </div>
      </div>

      {/* Features List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          {upcomingFeatures.map((feature, index) => (
            <div 
              key={feature.title}
              className="bg-gray-900 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 relative"
            >
              <div className="flex items-start gap-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <feature.icon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-2">
                      {feature.title}
                    </h3>
                    <span className="text-purple-400 text-sm font-medium px-3 py-1 bg-purple-600/20 rounded-full whitespace-nowrap">
                      {feature.date}
                    </span>
                  </div>
                  <div className="max-sm:portrait:block hidden">
                    {feature.title === 'SLOTTO.gg' && (
                      <img 
                        src="/SLOTTO_logo.jpg" 
                        alt="SLOTTO.gg Logo" 
                        className="w-full max-w-[250px] rounded-xl object-contain my-4"
                      />
                    )}
                    {feature.title === 'Spades' && (
                      <video 
                        className="w-full max-w-[250px] rounded-xl my-4"
                        autoPlay
                        loop
                        muted
                        playsInline
                      >
                        <source src="/BUXspades_web.mp4" type="video/mp4" />
                      </video>
                    )}
                  </div>
                  <p className="text-gray-300 mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-2 portrait:md:max-w-[60%] portrait:lg:max-w-[75%]">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="text-gray-400 text-sm flex items-center">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></span>
                        <span className="flex-1">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="max-sm:portrait:hidden block">
                {feature.title === 'SLOTTO.gg' && (
                  <img 
                    src="/SLOTTO_logo.jpg" 
                    alt="SLOTTO.gg Logo" 
                    className="absolute bottom-4 right-4 h-28 w-auto rounded-xl object-contain"
                  />
                )}
                {feature.title === 'Spades' && (
                  <video 
                    className="absolute bottom-4 right-4 w-[250px] rounded-xl"
                    autoPlay
                    loop
                    muted
                    playsInline
                  >
                    <source src="/BUXspades_web.mp4" type="video/mp4" />
                  </video>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Newsletter Signup */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
            Stay Updated
          </h2>
          <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
            Join our Discord server to get notified when these features launch and be the first to participate in our upcoming events.
          </p>
          <a
            href="https://discord.gg/buxdao"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            Join Discord
          </a>
        </div>
      </div>
    </div>
  );
};

export default Roadmap; 