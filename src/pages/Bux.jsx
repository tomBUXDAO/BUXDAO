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
  const [isLoading, setIsLoading] = useState(false);
  const [viewType, setViewType] = useState('bux,nfts'); // 'bux', 'nfts', 'combined'
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
  const baseUrl = import.meta.env.DEV ? '' : 'https://buxdao.com';    // Use local API in development

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Debug log
        console.log('Fetching from:', `${baseUrl}/api/token-metrics`);
        
        // Always fetch token metrics for BUX values
        const metricsResponse = await fetch(`${baseUrl}/api/token-metrics`);
        
        if (!metricsResponse.ok) {
          console.error('Metrics response error:', await metricsResponse.text());
          throw new Error(`HTTP error! status: ${metricsResponse.status}`);
        }
        
        const metricsData = await metricsResponse.json();
        console.log('Metrics data:', metricsData); // Debug log
        
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
        const holdersResponse = await fetch(`${baseUrl}/api/top-holders?type=${viewType}&collection=${selectedCollection}`);

        if (!holdersResponse.ok) {
          console.error('Holders response error:', await holdersResponse.text());
          throw new Error(`HTTP error! status: ${holdersResponse.status}`);
        }
        
        const holdersData = await holdersResponse.json();
        console.log('Holders data:', holdersData); // Debug log
        setTopHolders(holdersData.holders);
      } catch (error) {
        console.error('Error fetching data:', error);
        setTopHolders([]);
      } finally {
        setIsLoading(false);
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
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">
              $BUX - tokenomics kept simple
            </h2>
            <div className="max-w-3xl mx-auto space-y-6 text-gray-200 text-xl px-8 sm:px-16 border-2 border-purple-400/20 rounded-2xl py-8 mb-16">
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

          {/* Two Column Layout for Token Metrics and Revenue Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Token Metrics */}
            <div className="bg-gray-900 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <BanknotesIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
                    Token Metrics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <p className="text-gray-300 text-sm mb-1">Total Supply</p>
                      <p className="text-gray-200 font-semibold text-xl">{tokenData.totalSupply}</p>
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm mb-1">Public Supply</p>
                      <p className="text-gray-200 font-semibold text-xl">{tokenData.publicSupply}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-gray-300 text-sm mb-1">Liquidity Pool</p>
                      <p className="text-gray-200 font-semibold text-xl">
                        {tokenData.liquidityPool} SOL
                        <span className="text-gray-400 text-sm ml-1">
                          {tokenData.solPrice ? `($${(Number(tokenData.liquidityPool) * tokenData.solPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })})` : ''}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm mb-1">Token Value (SOL)</p>
                      <p className="text-gray-200 font-semibold text-xl">
                        {tokenData.tokenValue} SOL
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm mb-1">Token Value (USD)</p>
                      <p className="text-gray-200 font-semibold text-xl">
                        ${tokenData.solPrice ? (Number(tokenData.tokenValue) * tokenData.solPrice).toFixed(8) : '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
          </div>

          {/* Top Holders - Full Width */}
          <div className="bg-gray-900 rounded-xl p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex flex-col items-start gap-4">
              <div className="flex items-center gap-4 w-full">
                <div className="bg-purple-600/20 p-3 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Holders
                </h3>
              </div>
              <div className="flex-1 w-full">
                <span className="block text-gray-400 text-sm mb-4">Listed NFTs are not included in holder counts</span>
                
                {/* Filter Controls */}
                <div className="flex flex-col gap-4 mb-6">
                  <select 
                    className="bg-gray-800 border border-purple-400/20 rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                  >
                    <option value="bux,nfts">BUX + NFTs</option>
                    <option value="bux">BUX Only</option>
                    <option value="nfts">NFTs Only</option>
                  </select>
                  
                  {viewType === 'nfts' && (
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
                  {isLoading ? (
                    <div className="text-gray-400 text-center py-4">Loading...</div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto relative border border-gray-700 rounded-lg">
                      <table className="w-full text-sm whitespace-nowrap">
                        <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm shadow-lg z-10 text-gray-400">
                          <tr className="border-b border-gray-700">
                            {viewType === 'bux' ? (
                              <>
                                <th className="text-left py-4 px-6 min-w-[140px] text-purple-300">Holder</th>
                                <th className="text-right py-4 px-6 min-w-[140px] text-purple-300">Balance</th>
                                <th className="text-right py-4 px-6 min-w-[100px] text-purple-300">Share</th>
                                <th className="text-right py-4 px-6 min-w-[120px] text-purple-300">Value (SOL)</th>
                                <th className="text-right py-4 px-6 min-w-[120px] text-purple-300">Value (USD)</th>
                              </>
                            ) : viewType === 'nfts' ? (
                              <>
                                <th className="text-left py-4 px-6 min-w-[140px] text-purple-300">Holder</th>
                                <th className="text-right py-4 px-6 min-w-[100px] text-purple-300">NFTs</th>
                                <th className="text-right py-4 px-6 min-w-[120px] text-purple-300">Value (SOL)</th>
                                <th className="text-right py-4 px-6 min-w-[120px] text-purple-300">Value (USD)</th>
                              </>
                            ) : (
                              <>
                                <th className="text-center py-4 px-6 min-w-[80px] text-purple-300">Rank</th>
                                <th className="text-left py-4 px-6 min-w-[140px] text-purple-300">Holder</th>
                                <th className="text-right py-4 px-6 min-w-[140px] text-purple-300">BUX Balance</th>
                                <th className="text-right py-4 px-6 min-w-[100px] text-purple-300">NFTs</th>
                                <th className="text-right py-4 px-6 min-w-[120px] text-purple-300">Value (SOL)</th>
                                <th className="text-right py-4 px-6 min-w-[120px] text-purple-300">Value (USD)</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {topHolders.map((holder, index) => (
                            <tr key={index} className={`text-gray-200 border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-transparent'}`}>
                              {viewType === 'bux,nfts' && (
                                <td className="py-3 px-6 text-center font-semibold">
                                  {index === 0 && <span title="1st Place" className="text-yellow-500">🥇 1</span>}
                                  {index === 1 && <span title="2nd Place" className="text-gray-300">🥈 2</span>}
                                  {index === 2 && <span title="3rd Place" className="text-amber-600">🥉 3</span>}
                                  {index > 2 && index < 10 && <span title={`Top 10`} className="text-yellow-500">⭐ {index + 1}</span>}
                                  {index >= 10 && index < 25 && <span title={`Top 25`} className="text-gray-300">⭐ {index + 1}</span>}
                                  {index >= 25 && <span title={`Rank ${index + 1}`} className="text-amber-600">● {index + 1}</span>}
                                </td>
                              )}
                              <td className="py-3 px-6 text-purple-400">{holder.address}</td>
                              {viewType === 'bux' ? (
                                <>
                                  <td className="py-3 px-6 text-right">{holder.amount}</td>
                                  <td className="py-3 px-6 text-right">{holder.percentage}</td>
                                  <td className="py-3 px-6 text-right">{holder.value.split(' ')[0]} SOL</td>
                                  <td className="py-3 px-6 text-right">${holder.value.split('($')[1]?.replace(')', '')}</td>
                                </>
                              ) : viewType === 'nfts' ? (
                                <>
                                  <td className="py-3 px-6 text-right">{holder.amount.split(' ')[0]}</td>
                                  <td className="py-3 px-6 text-right">{holder.value.split(' ')[0]} SOL</td>
                                  <td className="py-3 px-6 text-right">${holder.value.split('($')[1]?.replace(')', '')}</td>
                                </>
                              ) : (
                                <>
                                  <td className="py-3 px-6 text-right">{holder.bux}</td>
                                  <td className="py-3 px-6 text-right">{holder.nfts ? holder.nfts.split(' ')[0] : holder.nftCount}</td>
                                  <td className="py-3 px-6 text-right">{holder.value.split(' ')[0]} SOL</td>
                                  <td className="py-3 px-6 text-right">${holder.value.split('($')[1]?.replace(')', '')}</td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Section */}
          <div className="mt-16 mb-16">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 text-center leading-relaxed mb-16 py-2">
              Daily Rewards
            </h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - BUXBOT Info */}
            <div className="space-y-6 text-gray-200 text-xl border-2 border-purple-400/20 rounded-2xl py-8 px-8">
              <div className="flex items-start gap-4">
                <SparklesIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  When holders link discord profile and wallet address, they become eligible for daily rewards
                </p>
              </div>
              
              <div className="flex items-start gap-4">
                <BanknotesIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  Rewards are paid per unlisted NFT and credited in $BUX to users CLAIM accounts
                </p>
              </div>
              
              <div className="flex items-start gap-4">
                <UsersIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  BUXBOT is synced with Discord so it will automatically keep all holder based roles updated
                </p>
              </div>
              
              <div className="flex items-start gap-4">
                <ShieldCheckIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <p>
                  Roles are refreshed daily and rewards paid based on NFT holdings at the end of 24 hours
                </p>
              </div>
            </div>

            {/* Right Column - Reward Allocations */}
            <div className="bg-gray-800/50 rounded-xl p-6">
              <h4 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6">Daily Reward Allocations</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-200">Celeb Catz</span>
                  <span className="text-purple-400 font-semibold ml-4">20 $BUX</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-200">Money Monsters 3D</span>
                  <span className="text-purple-400 font-semibold ml-4">7 $BUX</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-200">FCKed Catz</span>
                  <span className="text-purple-400 font-semibold ml-4">5 $BUX</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-200">Money Monsters</span>
                  <span className="text-purple-400 font-semibold ml-4">5 $BUX</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-200">A.I. BitBots</span>
                  <span className="text-purple-400 font-semibold ml-4">3 $BUX</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-200">Collab Collections</span>
                  <span className="text-purple-400 font-semibold ml-4">1 $BUX</span>
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