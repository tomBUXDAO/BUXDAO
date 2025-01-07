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

const Bux = () => {
  const [tokenData, setTokenData] = useState({
    totalSupply: '0',
    publicSupply: '0',
    exemptSupply: '0',
    liquidityPool: '0',
    solPrice: 0,
    tokenValue: 0
  });

  const [topHolders, setTopHolders] = useState([]);
  const [viewType, setViewType] = useState('bux'); // 'bux', 'nfts', 'combined'
  const [selectedCollection, setSelectedCollection] = useState('all');
  
  const collections = [
    { id: 'all', name: 'All Collections' },
    { id: 'fckedcatz', name: 'FCKed Catz' },
    { id: 'moneymonsters', name: 'Money Monsters' },
    { id: 'aibitbots', name: 'A.I. BitBots' },
    { id: 'moneymonsters3d', name: 'Money Monsters 3D' },
    { id: 'celebcatz', name: 'Celebrity Catz' }
  ];

  // Get the base URL for API calls
  const baseUrl = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001' 
    : 'https://api.buxdao.com';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch token metrics
        const metricsResponse = await fetch(`${baseUrl}/api/token-metrics`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!metricsResponse.ok) {
          throw new Error(`HTTP error! status: ${metricsResponse.status}`);
        }
        
        const metricsData = await metricsResponse.json();
        
        // Format the values
        const formatNumber = (num) => Number(num).toLocaleString(undefined, { maximumFractionDigits: 2 });
        const formatSol = (num) => Number(num).toFixed(2);
        const formatTokenValue = (num) => Number(num).toFixed(8);
        
        setTokenData({
          totalSupply: formatNumber(metricsData.totalSupply),
          publicSupply: formatNumber(metricsData.publicSupply),
          exemptSupply: formatNumber(metricsData.exemptSupply),
          liquidityPool: formatSol(metricsData.liquidityPool),
          solPrice: metricsData.solPrice,
          tokenValue: formatTokenValue(metricsData.tokenValue)
        });

        // Fetch top holders with filters
        const holdersResponse = await fetch(`${baseUrl}/api/top-holders?type=${viewType}&collection=${selectedCollection}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (!holdersResponse.ok) {
          throw new Error(`HTTP error! status: ${holdersResponse.status}`);
        }
        
        const holdersData = await holdersResponse.json();
        setTopHolders(holdersData.holders);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [viewType, selectedCollection, baseUrl]);

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
    <div className="bg-black min-h-screen pt-20">
      {/* Hero Section */}
      <section className="bg-black py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
              $BUX - tokenomics kept simple
            </h1>
            <div className="max-w-3xl mx-auto space-y-6 text-gray-200 text-xl px-8 sm:px-16 border-2 border-purple-400/20 rounded-2xl py-8">
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
          <div className="bg-gray-900 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300 mb-8">
            <div className="flex items-start gap-4">
              <div className="bg-purple-600/20 p-3 rounded-lg">
                <BanknotesIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
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
                    <p className="text-gray-200 font-semibold text-xl">
                      {tokenData.liquidityPool} SOL
                      <span className="text-gray-400 text-sm ml-1">
                        {tokenData.solPrice ? `($${(Number(tokenData.liquidityPool) * tokenData.solPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-300 text-sm mb-1">Token Value</p>
                    <p className="text-gray-200 font-semibold text-xl">
                      {tokenData.tokenValue} SOL
                      <span className="text-gray-400 text-sm ml-1">
                        {tokenData.solPrice ? `($${(Number(tokenData.tokenValue) * tokenData.solPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Layout for Revenue Sources and Top Holders */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Revenue Sources */}
            <div className="bg-gray-900 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <TagIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
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
            <div className="bg-gray-900 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                    Top Holders
                  </h3>
                  
                  {/* Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <select 
                      className="bg-gray-800 border border-purple-400/20 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                      value={viewType}
                      onChange={(e) => setViewType(e.target.value)}
                    >
                      <option value="bux">BUX Only</option>
                      <option value="nfts">NFTs Only</option>
                      <option value="combined">BUX + NFTs</option>
                    </select>
                    
                    {viewType !== 'bux' && (
                      <select 
                        className="bg-gray-800 border border-purple-400/20 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                        value={selectedCollection}
                        onChange={(e) => setSelectedCollection(e.target.value)}
                      >
                        {collections.map(collection => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left pb-2 w-1/4">Holder</th>
                          <th className="text-right pb-2 w-1/4">Amount</th>
                          <th className="text-right pb-2 w-1/4">Share</th>
                          <th className="text-right pb-2 w-1/4">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topHolders.map((holder, index) => (
                          <tr key={index} className="text-gray-200">
                            <td className="py-2 text-purple-400">{holder.address}</td>
                            <td className="py-2 text-right">{holder.amount}</td>
                            <td className="py-2 text-right">{holder.percentage}</td>
                            <td className="py-2 text-right">{holder.value}</td>
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