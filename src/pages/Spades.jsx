import { CurrencyDollarIcon, TrophyIcon, ChatBubbleLeftRightIcon, CogIcon } from '@heroicons/react/24/outline';

const Spades = () => {
  const features = [
    {
      title: 'Tournaments',
      description: 'Scheduled with prizes',
      icon: TrophyIcon
    },
    {
      title: 'Private Rooms',
      description: 'Custom games & chat',
      icon: ChatBubbleLeftRightIcon
    },
    {
      title: 'Custom Rules',
      description: 'Set your preferences',
      icon: CogIcon
    },
    {
      title: 'Purchase Coins',
      description: 'With USDC or Sol',
      icon: CurrencyDollarIcon
    }
  ];

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center pt-24 pb-12">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
        <div className="text-center mb-8 flex flex-col items-center justify-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 items-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 py-6 overflow-visible" style={{ fontFamily: "'Pacifico', cursive" }}>
              www.bux-spades.pro
            </h1>
            <span className="ml-0 sm:ml-4 px-6 py-4 min-w-[120px] bg-purple-600/30 text-purple-300 font-bold text-lg rounded-full inline-flex flex-col items-center justify-center align-middle mt-4 sm:mt-0 text-center" style={{ fontSize: '1.5rem', lineHeight: '1.2' }}>
              Coming<br />Soon
            </span>
          </div>
          <p className="text-md text-gray-300 max-w-2xl mx-auto mt-6">
            Get ready for BUX Spades, the ulimate spades platform.<br/>Play with friends, win coins in a fun and competitive online card game experience with unique and customisable game rules features.
          </p>
        </div>

        {/* Content: Video and Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Game Preview - Left Column */}
          <div className="md:col-span-2 order-1 md:order-1 text-center">
            <p className="text-lg text-yellow-400 mb-3 font-semibold inline-flex items-center">
              5mil FREE coins for new members
            </p>
            <div className="bg-gray-900 rounded-xl p-3 shadow-lg border border-purple-700 mx-auto max-w-md md:max-w-none">
              <div className="aspect-video rounded-lg overflow-hidden">
                <video 
                  className="w-full h-full object-cover"
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src="/BUXspades_web.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
          </div>

          {/* Features List - Right Column */}
          <div className="md:col-span-1 order-2 md:order-2 h-full flex items-center">
            <div className="bg-gray-900 rounded-xl p-5 w-full shadow-lg border border-purple-700">
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-5 text-left">Game Features</h3>
              <ul className="space-y-4">
                {features.map((feature) => (
                  <li key={feature.title} className="flex items-start text-gray-400 text-left">
                    <div className="bg-purple-600/30 p-2 rounded-lg w-fit mr-3 flex-shrink-0">
                       <feature.icon className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-md mb-0.5">{feature.title}</p>
                      <p className="text-gray-400 text-xs">{feature.description}</p>
                    </div>
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