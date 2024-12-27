import { CalendarIcon, CurrencyDollarIcon, GiftIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const ComingSoon = () => {
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
    <div className="bg-black min-h-screen pt-20">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-purple-900/50 to-black py-12">
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
              className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 relative"
            >
              <div className="flex items-start gap-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <feature.icon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="text-2xl md:text-3xl font-semibold text-yellow-400 mb-2">
                      {feature.title}
                    </h3>
                    <span className="text-purple-400 text-sm font-medium px-3 py-1 bg-purple-600/20 rounded-full">
                      {feature.date}
                    </span>
                  </div>
                  <p className="text-gray-300 mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-2">
                    {feature.details.map((detail, i) => (
                      <li key={i} className="text-gray-400 text-sm flex items-center">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></span>
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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
                  <source src="/BUXspades.mp4" type="video/mp4" />
                </video>
              )}
            </div>
          ))}
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Stay Updated
          </h2>
          <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
            Join our Discord server to get notified when these features launch and be the first to participate in our upcoming events.
          </p>
          <button className="bg-[#5865F2] text-white px-8 py-3 rounded-full hover:bg-[#4752C4] transition-colors inline-flex items-center space-x-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            <span>Join Discord</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon; 