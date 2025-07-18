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
import UserProfile from '../components/UserProfile';

const Bux = () => {
  const [error, setError] = useState(null);
  
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
  const [viewType, setViewType] = useState('bux,nfts');
  const [selectedCollection, setSelectedCollection] = useState('all');
  const [collectionsWithHolders, setCollectionsWithHolders] = useState(new Set(['all']));
  
  // New state to store available collections from the API
  const [availableCollections, setAvailableCollections] = useState([]);
  
  const collections = [
    { id: 'all', name: 'All Collections' },
    { id: 'fckedcatz', name: 'Fcked Catz' },
    { id: 'mm', name: 'Money Monsters' },
    { id: 'aibb', name: 'A.I. BitBots' },
    { id: 'mm3d', name: 'Money Monsters 3D' },
    { id: 'celebcatz', name: 'Celebrity Catz' },
    { id: 'shxbb', name: 'A.I. Warriors' },
    { id: 'ausqrl', name: 'A.I. Secret Squirrels' },
    { id: 'aelxaibb', name: 'A.I. Energy Apes' },
    { id: 'airb', name: 'Rejected Bots' },
    { id: 'clb', name: 'CandyBots' },
    { id: 'ddbot', name: 'DoodleBots' }
  ];

  // Get the base URL for API calls
  const baseUrl = import.meta.env.DEV ? 'http://localhost:3001' : 'https://buxdao.com';

  // Helper to get collection id from holder (for 'all' collections API response)
  const getCollectionIdFromHolder = (holder) => {
    // Try to infer collection id from holder data (backend should add a collectionId field if possible)
    // For now, try to parse from holder.address or add a field in backend if needed
    // This is a placeholder; adjust as needed if backend adds a collectionId field
    return holder.collectionId || holder.symbol?.toLowerCase() || null;
  };

  useEffect(() => {
    // For NFTs Only view, fetch all holders for all collections to determine which collections have holders
    // This logic is no longer needed as the backend provides availableCollections
    /*
    if (viewType === 'nfts') {
      fetch(`${baseUrl}/api/top-holders?collection=all&type=nfts`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.holders)) {
            // Extract collection ids from holders
            const ids = new Set(['all']);
            data.holders.forEach(holder => {
              const id = getCollectionIdFromHolder(holder);
              if (id) ids.add(id);
            });
            setCollectionsWithHolders(ids);
          }
        })
        .catch(() => setCollectionsWithHolders(new Set(['all'])));
    }
    */
  }, [viewType, baseUrl]);

  const validateHolderData = (holder) => {
    if (!holder || typeof holder !== 'object') {
      if (viewType !== 'nfts') console.warn('Invalid holder data:', holder);
      return false;
    }

    if (viewType === 'nfts') {
      // Accept both new backend formats for NFT holders
      const isNFTsOnly = holder.address && holder.amount && holder.value;
      const isCombined = holder.discord_id && holder.discord_username && holder.nfts && holder.value;
      const isValid = (isNFTsOnly || isCombined) &&
                      typeof holder.value === 'string' &&
                      holder.value.includes('SOL');
      if (!isValid) {
        console.warn('Invalid NFT holder data:', holder);
      }
      return isValid;
    }

    if (viewType === 'bux') {
      // New backend format for BUX holders
      const isValid = holder.discord_id && 
                     holder.discord_username && 
                     holder.bux &&
                     holder.percentage &&
                     holder.value &&
                     typeof holder.value === 'string' &&
                     holder.value.includes('SOL');
      if (!isValid) {
        console.warn('Invalid BUX holder data:', holder);
      }
      return isValid;
    }

    // Combined view (bux,nfts) - accept new backend format
    const isValid = holder.discord_id && (holder.nfts !== undefined || holder.bux !== undefined);
    if (!isValid) {
      console.warn('Invalid combined holder data:', holder);
    }
    return isValid;
  };

  useEffect(() => {
    // Reset holders data and error when view type or collection changes
    setTopHolders([]);
    setError(null);

    const fetchData = async () => {
      try {
        setIsLoading(true);

        const [metricsResponse, holdersResponse] = await Promise.all([
          fetch(`${baseUrl}/api/token-metrics`),
          fetch(`${baseUrl}/api/top-holders?collection=${selectedCollection}&type=${viewType}`)
        ]);

        if (!metricsResponse.ok || !holdersResponse.ok) {
          const errorData = await holdersResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch data');
        }

        const [metricsData, holdersData] = await Promise.all([
          metricsResponse.json(),
          holdersResponse.json()
        ]);

        console.log('View Type:', viewType);
        console.log('Selected Collection:', selectedCollection);
        console.log('Holders API Response:', holdersData);
        console.log('Holders Data:', holdersData.holders);

        if (!Array.isArray(holdersData.holders)) {
          throw new Error('Invalid holders data received');
        }

        // Update available collections if provided in the response
        if (holdersData.availableCollections && Array.isArray(holdersData.availableCollections)) {
          console.log('Available Collections from API:', holdersData.availableCollections);
          setAvailableCollections(holdersData.availableCollections);
        } else {
           // Fallback: if API doesn't provide the list, use the hardcoded list (shouldn't happen with recent backend changes)
           console.warn('API did not provide availableCollections, using hardcoded list.');
           setAvailableCollections([
            { id: 'all', name: 'All Collections' },
            { id: 'fckedcatz', name: 'Fcked Catz' },
            { id: 'mm', name: 'Money Monsters' },
            { id: 'aibb', name: 'A.I. BitBots' },
            { id: 'mm3d', name: 'Money Monsters 3D' },
            { id: 'celebcatz', name: 'Celebrity Catz' },
            { id: 'shxbb', name: 'A.I. Warriors' },
            { id: 'ausqrl', name: 'A.I. Secret Squirrels' },
            { id: 'aelxaibb', name: 'A.I. Energy Apes' },
            { id: 'airb', name: 'Rejected Bots' },
            { id: 'clb', name: 'CandyBots' },
            { id: 'ddbot', name: 'DoodleBots' }
          ]);
        }

        // Validate the data before setting state
        const validHolders = holdersData.holders.filter(validateHolderData);
        console.log('Valid holders:', validHolders.length, 'of', holdersData.holders.length);

        if (validHolders.length === 0 && holdersData.holders.length > 0) {
          throw new Error('No valid holder data found in response');
        }

        setTokenData(metricsData);
        setTopHolders(validHolders);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        setTopHolders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedCollection, viewType, baseUrl]);

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

  const renderHolderName = (holder) => {
    if (!holder) return '';
    return holder.discord_username || holder.address;
  };

  return (
    <div className="bg-black min-h-screen pt-8">
      {/* Hero Section */}
      <section className="bg-black py-8 sm:py-12">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 py-6">
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
                      <p className="text-gray-200 font-semibold text-xl">{Number(tokenData.totalSupply).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm mb-1">Public Supply</p>
                      <p className="text-gray-200 font-semibold text-xl">{Number(tokenData.publicSupply).toFixed(2)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-gray-300 text-sm mb-1">Liquidity Pool</p>
                      <p className="text-gray-200 font-semibold text-xl">
                        {Number(tokenData.liquidityPool).toFixed(4)} SOL
                        <span className="text-gray-400 text-sm ml-1">
                          {tokenData.solPrice ? `($${(Number(tokenData.liquidityPool) * tokenData.solPrice).toFixed(2)})` : ''}
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-300 text-sm mb-1">Token Value (SOL)</p>
                      <p className="text-gray-200 font-semibold text-xl">
                        {Number(tokenData.tokenValue).toFixed(8)} SOL
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
                  <div className="space-y-2">
                    {revenueSources.map((source, index) => (
                      <div key={index} className="text-gray-400 text-sm">
                        <div>
                          <div className="text-gray-200 font-semibold mb-1">{source.title}</div>
                          <p className="text-gray-400 text-sm">{source.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                {error && (
                  <div className="text-red-500 bg-red-100/10 p-4 rounded-lg mb-4">
                    Error: {error}
                  </div>
                )}
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
                      {/* Use availableCollections from state to filter frontend collections list */}
                      {collections
                        .filter(collection => availableCollections.some(avail => avail.value === collection.id))
                        .map(collection => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="overflow-x-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-400"></div>
                      <span className="ml-3 text-gray-400">Loading holders data...</span>
                    </div>
                  ) : error ? (
                    <div className="text-red-500 bg-red-100/10 p-4 rounded-lg">
                      <p className="font-semibold">Error loading holders data:</p>
                      <p className="mt-1">{error}</p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      >
                        Retry
                      </button>
                    </div>
                  ) : topHolders.length === 0 ? (
                    <div className="text-gray-400 text-center py-8">
                      <p>No holders found for the selected criteria.</p>
                      {viewType === 'nfts' && selectedCollection !== 'all' && (
                        <p className="mt-2">Try selecting "All Collections" to see all NFT holders.</p>
                      )}
                    </div>
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
                          {topHolders.filter(validateHolderData).map((holder, index) => {
                            // For the new backend format, we don't have holder.value anymore
                            // The new format has discord_id, discord_username, nfts, bux
                            if (!holder || !holder.discord_id) {
                              console.warn('Skipping invalid holder data:', holder);
                              return null;
                            }

                            // Parse SOL and USD values from the backend's value string
                            let solValue = 0;
                            let usdValue = 0;
                            
                            if (holder.value) {
                              // Try to parse the value string format: "XX.XX SOL ($YY.YY)"
                              const valueMatch = holder.value.match(/^(\d+(\.\d+)?)\s+SOL\s+\(\$(\d+(\.\d+)?)\)/);
                              if (valueMatch) {
                                solValue = parseFloat(valueMatch[1]);
                                usdValue = parseFloat(valueMatch[3]);
                              } else {
                                // If parsing fails, try to extract just the SOL value
                                const solMatch = holder.value.match(/(\d+(\.\d+)?)\s*SOL/);
                                if (solMatch) {
                                  solValue = parseFloat(solMatch[1]);
                                  usdValue = solValue * (tokenData.solPrice || 0);
                                }
                              }
                            }

                            return (
                              <tr key={index} className={`text-gray-200 border-b border-gray-800 ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-transparent'}`}>
                                {viewType === 'bux,nfts' ? (
                                  <>
                                    <td className="py-3 px-6 text-center font-semibold">
                                      {/* Rank display logic */}
                                      {index === 0 && <span title="1st Place" className="text-yellow-500">🥇 {index + 1}</span>}
                                      {index === 1 && <span title="2nd Place" className="text-gray-300">🥈 {index + 1}</span>}
                                      {index === 2 && <span title="3rd Place" className="text-amber-600">🥉 {index + 1}</span>}
                                      {index > 2 && index < 10 && <span title={`Top ${index + 1}`} className="text-yellow-500">⭐ {index + 1}</span>}
                                      {index >= 10 && index < 25 && <span title={`Top ${index + 1}`} className="text-gray-300">⭐ {index + 1}</span>}
                                      {index >= 25 && <span title={`Rank ${index + 1}`} className="text-amber-600">● {index + 1}</span>}
                                    </td>
                                    <td className="py-3 px-6 text-purple-400">{holder.discord_username}</td>
                                    <td className="py-3 px-6 text-right">{holder.bux}</td>
                                    <td className="py-3 px-6 text-right">{String(holder.nfts).replace(/\s*NFTs?\s*$/, '')} NFTs</td>
                                    <td className="py-3 px-6 text-right">{solValue.toFixed(2)} SOL</td>
                                    <td className="py-3 px-6 text-right">${usdValue.toFixed(2)}</td>
                                  </>
                                ) : viewType === 'bux' ? (
                                  <>
                                    {/* BUX Only view - using new format */}
                                    <td className="py-3 px-6 text-purple-400">{holder.discord_username}</td>
                                    <td className="py-3 px-6 text-right">{holder.bux}</td>
                                    <td className="py-3 px-6 text-right">{holder.percentage}%</td>
                                    <td className="py-3 px-6 text-right">{solValue.toFixed(2)} SOL</td>
                                    <td className="py-3 px-6 text-right">${usdValue.toFixed(2)}</td>
                                  </>
                                ) : viewType === 'nfts' ? (
                                  <>
                                    <td className="py-3 px-6 text-purple-400">{holder.address}</td>
                                    <td className="py-3 px-6 text-right">{holder.amount?.replace(/\s*NFTs?\s*$/, '')}</td>
                                    <td className="py-3 px-6 text-right">{solValue.toFixed(2)} SOL</td>
                                    <td className="py-3 px-6 text-right">${usdValue.toFixed(2)}</td>
                                  </>
                                ) : null}
                              </tr>
                            );
                          }).filter(Boolean)}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rewards Section */}
          <div id="rewards" className="mt-16 mb-16">
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
                  <span className="text-gray-200">Fcked Catz</span>
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
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-200">Monster - Top 10 ranks <span className="text-yellow-500">⭐</span></span>
                  <span className="text-purple-400 font-semibold ml-4">x2</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-200">Cat - branded merch <span className="text-yellow-500">⭐</span></span>
                  <span className="text-purple-400 font-semibold ml-4">x2</span>
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

      {/* Add UserProfile section at the bottom */}
      <section id="mybux" className="mt-4">
        <UserProfile tokenValue={tokenData.tokenValue} solPrice={tokenData.solPrice} />
      </section>
    </div>
  );
};

export default Bux; 