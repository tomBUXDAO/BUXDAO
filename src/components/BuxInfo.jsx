import { useState, useEffect } from 'react';
import { 
  XCircleIcon, 
  ShieldCheckIcon, 
  BanknotesIcon, 
  UsersIcon 
} from '@heroicons/react/24/outline';

const BuxInfo = () => {
  // Example state - replace with real data fetching
  const [tokenData, setTokenData] = useState({
    totalSupply: '10,000,000',
    publicSupply: '1,000,000',
    liquidityPool: '250,000',
    tokenValue: '$0.12'
  });

  const revenueSources = [
    {
      title: 'NFT Sales Royalties',
      description: '8% of all 5 main collection NFT sales and 4% of all collab collection sales (providing royalties are paid)'
    },
    {
      title: 'SLOTTO.gg (launching Q1 2025)',
      description: '2% of all weekly lottery ticket sales'
    },
    {
      title: 'Services',
      description: 'Profits from dev/artwork produced for other projects'
    },
    {
      title: 'NEW mints',
      description: 'A new collection is planned for launch in 2025 with all mint fees being added to the pot'
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
    <section id="bux" className="bg-gradient-to-b from-purple-900 to-black py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
            $BUX - tokenomics kept simple
          </h2>
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Token Valuation */}
          <div className="bg-gray-100/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-8">
              Token Metrics
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-gray-700 mb-2">Total Supply</p>
                <p className="text-gray-900 font-bold text-3xl">{tokenData.totalSupply}</p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Public Supply</p>
                <p className="text-gray-900 font-bold text-3xl">{tokenData.publicSupply}</p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Liquidity Pool</p>
                <p className="text-gray-900 font-bold text-3xl">{tokenData.liquidityPool}</p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Token Value</p>
                <p className="text-gray-900 font-bold text-3xl">{tokenData.tokenValue}</p>
              </div>
            </div>
          </div>

          {/* Revenue Sources */}
          <div className="bg-gray-100/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6">
              Revenue Sources
            </h3>
            <div className="space-y-4">
              {revenueSources.map((source, index) => (
                <div key={index} className="border-b border-gray-300 last:border-0 pb-4 last:pb-0">
                  <h4 className="text-gray-900 font-semibold mb-1">{source.title}</h4>
                  <p className="text-gray-700 text-sm leading-tight">{source.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Holders */}
          <div className="bg-gray-100/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-8">
              Top Holders
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-700 text-sm border-b border-gray-300">
                    <th className="text-left pb-4">Address</th>
                    <th className="text-left pb-4">Amount</th>
                    <th className="text-left pb-4">%</th>
                  </tr>
                </thead>
                <tbody>
                  {topHolders.map((holder, index) => (
                    <tr key={index} className="text-gray-900 border-b border-gray-200 last:border-0">
                      <td className="py-4 text-purple-700">{holder.address}</td>
                      <td className="py-4">{holder.amount}</td>
                      <td className="py-4">{holder.percentage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BuxInfo; 