import React, { useState, useEffect, useRef } from 'react';

const Bux = () => {
  const [viewType, setViewType] = useState('bux,nfts');
  const [collection, setCollection] = useState('all');
  const [holders, setHolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const fetchHolders = async () => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        abortControllerRef.current = new AbortController();
        setLoading(true);
        setError(null);
        setHolders([]); // Clear existing data while loading

        const response = await fetch(
          `/api/top-holders?type=${viewType}&collection=${collection}`,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch holders data: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.holders) {
          throw new Error('Invalid response format');
        }

        // Validate and transform holder data
        const validHolders = data.holders.filter(holder => 
          holder && 
          typeof holder === 'object' && 
          holder.address && 
          (holder.amount || holder.bux || holder.nfts)
        );

        if (validHolders.length === 0) {
          setHolders([]);
          return;
        }

        setHolders(validHolders);
        
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Error fetching data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHolders();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [viewType, collection]);

  const renderAmount = (holder) => {
    if (!holder) return '0';
    if (viewType === 'nfts') {
      return holder.amount || '0 NFTs';
    }
    if (viewType === 'bux') {
      return holder.amount || '0';
    }
    return `${holder.bux || '0'} BUX | ${holder.nfts || '0 NFTs'}`;
  };

  const renderValue = (holder) => {
    if (!holder) return '0';
    return holder.value || '0';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Loading holders data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">Error loading holders data</div>
        <div className="text-sm text-gray-400 mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!holders || holders.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400">No holders found</div>
        <div className="text-sm text-gray-500 mt-2">
          {viewType === 'nfts' 
            ? 'Try selecting a different collection or check back later' 
            : 'Try a different view type or check back later'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex space-x-4">
        <select
          value={viewType}
          onChange={(e) => setViewType(e.target.value)}
          className="bg-gray-800 text-white rounded px-4 py-2"
        >
          <option value="bux,nfts">All Holdings</option>
          <option value="bux">BUX Only</option>
          <option value="nfts">NFTs Only</option>
        </select>
        
        {viewType === 'nfts' && (
          <select
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
            className="bg-gray-800 text-white rounded px-4 py-2"
          >
            <option value="all">All Collections</option>
            <option value="fckedcatz">FCKed Catz</option>
            <option value="moneymonsters">Money Monsters</option>
            <option value="aibitbots">AI BitBots</option>
            <option value="moneymonsters3d">Money Monsters 3D</option>
            <option value="celebcatz">Celebrity Catz</option>
            <option value="shxbb">A.I. Warriors</option>
            <option value="ausqrl">A.I. Secret Squirrels</option>
            <option value="aelxaibb">A.I. Energy Apes</option>
            <option value="airb">Rejected Bots</option>
            <option value="clb">CandyBots</option>
            <option value="ddbot">DoodleBots</option>
          </select>
        )}
      </div>

      <div className="bg-gray-900 rounded-lg shadow-xl overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Holder
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {viewType === 'nfts' ? 'NFTs' : viewType === 'bux' ? 'Amount' : 'Holdings'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                {viewType === 'bux,nfts' ? 'Total Value' : 'Value'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {holders.map((holder, index) => (
              <tr key={index} className="hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {holder.address}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {renderAmount(holder)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {renderValue(holder)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Bux; 