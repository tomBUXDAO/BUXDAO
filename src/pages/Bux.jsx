import { 
  XCircleIcon, 
  ShieldCheckIcon, 
  BanknotesIcon, 
  UsersIcon,
  TagIcon,
  TicketIcon,
  WrenchScrewdriverIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Bux = () => {
  // Moving the state and data from BuxInfo component
  const tokenData = {
    totalSupply: '10,000,000',
    publicSupply: '1,000,000',
    liquidityPool: '250,000',
    tokenValue: '$0.12'
  };

  const revenueSources = [
    {
      title: 'NFT Sales Royalties',
      description: '8% of all 5 main collection NFT sales and 4% of all collab collection sales (providing royalties are paid)',
      icon: TagIcon
    },
    {
      title: (
        <>
          SLOTTO.gg
          <br />
          <span className="text-sm font-normal">(launching Q1 2025)</span>
        </>
      ),
      description: '2% of all weekly lottery ticket sales',
      icon: TicketIcon
    },
    {
      title: 'Services',
      description: 'Profits from dev/artwork produced for other projects',
      icon: WrenchScrewdriverIcon
    },
    {
      title: 'NEW mints',
      description: 'A new collection is planned for launch in 2025 with all mint fees being added to the pot',
      icon: SparklesIcon
    }
  ];

  const topHolders = [
    { address: '8xJ4...3Rfq', amount: '100,000', percentage: '10%' },
    { address: '9vK5...7Tpw', amount: '75,000', percentage: '7.5%' },
    { address: '3mN2...8Yxc', amount: '50,000', percentage: '5%' },
    { address: '5pL7...1Hdn', amount: '25,000', percentage: '2.5%' },
    { address: '2wQ9...4Kfm', amount: '10,000', percentage: '1%' }
  ];

  return (
    <div className="bg-black min-h-screen pt-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-purple-900 to-black py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
              $BUX - tokenomics kept simple
            </h1>
            <div className="max-w-3xl mx-auto space-y-6 text-gray-200 text-xl px-8 sm:px-16 border-2 border-white/20 rounded-2xl py-8">
              <div className="flex items-start gap-4">
                <XCircleIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  Our token is not tradable on coin exchanges and can only be earned through daily rewards by holders of our NFTs
                </p>
              </div>
              
              <div className="flex items-start gap-4">
                <ShieldCheckIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  This means the value of the token cannot be affected by external pump and dump traders
                </p>
              </div>
              
              <div className="flex items-start gap-4">
                <BanknotesIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  $BUX can be cashed out for Solana from our private liquidity pool (open a ticket in our discord server for more info)
                </p>
              </div>
              
              <div className="flex items-start gap-4">
                <UsersIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  The BUX team work on a voluntary basis so that all revenue generated can be added to our liquidity pool
                </p>
              </div>
            </div>
          </div>
          
          {/* Token Metrics - Full Width */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 mb-8">
            <div className="flex items-start gap-4">
              <div className="bg-purple-600/20 p-3 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-semibold text-yellow-400 mb-4">
                  Token Metrics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-gray-300 text-sm mb-1">Total Supply</p>
                    <p className="text-gray-200 font-semibold text-xl">{tokenData.totalSupply}</p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm mb-1">Public Supply</p>
                    <p className="text-gray-200 font-semibold text-xl">{tokenData.publicSupply}</p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm mb-1">Liquidity Pool</p>
                    <p className="text-gray-200 font-semibold text-xl">{tokenData.liquidityPool}</p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm mb-1">Token Value</p>
                    <p className="text-gray-200 font-semibold text-xl">{tokenData.tokenValue}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout for Revenue Sources and Top Holders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Revenue Sources */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <TagIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold text-yellow-400 mb-4">
                    Revenue Sources
                  </h3>
                  <ul className="space-y-2">
                    {revenueSources.map((source, index) => (
                      <li key={index} className="text-gray-400 text-sm flex items-center">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2"></span>
                        <div>
                          <div className="text-gray-200 font-semibold mb-1">{source.title}</div>
                          <p className="text-gray-400 text-sm">{source.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Top Holders */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold text-yellow-400 mb-4">
                    Top Holders
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-gray-400 text-sm">
                          <th className="text-left pb-2">Address</th>
                          <th className="text-left pb-2">Amount</th>
                          <th className="text-left pb-2">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topHolders.map((holder, index) => (
                          <tr key={index} className="text-gray-200">
                            <td className="py-2 text-purple-400">{holder.address}</td>
                            <td className="py-2">{holder.amount}</td>
                            <td className="py-2">{holder.percentage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Bux; 