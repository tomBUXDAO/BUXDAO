import { useState, useEffect } from 'react';
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

const BuxInfo = () => {
  const [tokenData, setTokenData] = useState({
    totalSupply: '0',
    publicSupply: '0',
    exemptSupply: '0',
    liquidityPool: '0',
    solPrice: 0,
    tokenValue: '0.00000000',
    tokenValueUsd: '0.00000000',
    lpUsdValue: '0.00'
  });

  const [topHolders, setTopHolders] = useState([]);
  
  // Get the base URL for API calls
  const baseUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://buxdao.com';

  useEffect(() => {
    const fetchSupplyData = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/token-metrics`);
        const data = await response.json();
        
        // Format the values with specific decimal places
        const formatNumber = (num) => Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
        const formatSol = (num) => num.toFixed(8);
        
        // Calculate USD values
        const tokenValueUsd = Number(data.tokenValue) * data.solPrice;
        
        setTokenData({
          totalSupply: formatNumber(data.totalSupply),
          publicSupply: formatNumber(data.publicSupply),
          exemptSupply: formatNumber(data.exemptSupply),
          liquidityPool: formatNumber(data.liquidityPool),
          solPrice: data.solPrice,
          tokenValue: formatSol(data.tokenValue),
          tokenValueUsd: tokenValueUsd,
          lpUsdValue: formatNumber(data.lpUsdValue)
        });
      } catch (error) {
        console.error('Error fetching token metrics:', error);
      }
    };

    const fetchTopHolders = async () => {
      try {
        const response = await fetch(`${baseUrl}/api/top-holders`);
        const data = await response.json();
        
        // Calculate USD values for holders
        const holdersWithUsd = data.holders.map(holder => ({
          ...holder,
          valueUsd: parseFloat(holder.value.split(' ')[1]) * tokenData.solPrice
        }));
        
        setTopHolders(holdersWithUsd);
      } catch (error) {
        console.error('Error fetching top holders:', error);
      }
    };

    fetchSupplyData();
    fetchTopHolders();

    // Refresh data every 60 seconds
    const interval = setInterval(fetchSupplyData, 60000);
    return () => clearInterval(interval);
  }, []);

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
          <div className="bg-gradient-to-br from-purple-200 to-purple-300/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
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
                <p className="text-gray-700 mb-2">Exempt Supply</p>
                <p className="text-gray-900 font-bold text-3xl">{tokenData.exemptSupply}</p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Liquidity Pool</p>
                <p className="text-gray-900 font-bold text-3xl">
                  {tokenData.liquidityPool} SOL
                  <span className="text-gray-600 text-lg ml-2">
                    (${tokenData.lpUsdValue})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-700 mb-2">Token Value</p>
                <p className="text-gray-900 font-bold text-3xl">
                  {tokenData.tokenValue} SOL
                  <span className="text-gray-600 text-lg ml-2">
                    (${tokenData.tokenValueUsd.toFixed(8)})
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Revenue Sources */}
          <div className="bg-gradient-to-br from-purple-200 to-purple-300/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-6">
              Revenue Sources
            </h3>
            <div className="space-y-4">
              {revenueSources.map((source, index) => (
                <div key={index} className="border-b border-gray-300 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-start gap-3">
                    <source.icon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-gray-900 font-semibold mb-1">{source.title}</h4>
                      <p className="text-gray-700 text-sm leading-tight">{source.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Holders */}
          <div className="bg-gradient-to-br from-purple-200 to-purple-300/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-8">
              Top Holders
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-700 text-sm border-b border-gray-300">
                    <th className="text-left pb-4">Address</th>
                    <th className="text-right pb-4">Amount</th>
                    <th className="text-right pb-4">%</th>
                    <th className="text-right pb-4">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {topHolders.map((holder, index) => (
                    <tr key={index} className="text-gray-900 border-b border-gray-200 last:border-0">
                      <td className="py-4 text-purple-700">{holder.address}</td>
                      <td className="py-4 text-right">{holder.amount}</td>
                      <td className="py-4 text-right">{holder.percentage}</td>
                      <td className="py-4 text-right">{holder.value} (${holder.valueUsd.toFixed(2)})</td>
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