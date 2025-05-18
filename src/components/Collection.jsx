import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

const COLLECTION_SUPPLIES = {
  fcked_catz: 1184,
  celebcatz: 124,
  money_monsters: 623,
  moneymonsters3d: 647,
  ai_bitbots: 205
};

const collections = [
  { 
    id: 1, 
    title: 'Fcked Catz', 
    image: '/gifs/catz.gif',
    magicEdenUrl: 'https://magiceden.io/marketplace/fcked_catz',
    tensorUrl: 'https://www.tensor.trade/trade/fcked_catz',
    symbol: 'fcked_catz'
  },
  { 
    id: 2, 
    title: 'Money Monsters', 
    image: '/gifs/mm.gif',
    magicEdenUrl: 'https://magiceden.io/marketplace/money_monsters',
    tensorUrl: 'https://www.tensor.trade/trade/money_monsters',
    symbol: 'money_monsters'
  },
  { 
    id: 3, 
    title: 'A.I. BitBots', 
    image: '/gifs/bitbot.gif',
    magicEdenUrl: 'https://magiceden.io/marketplace/ai_bitbots',
    tensorUrl: 'https://www.tensor.trade/trade/ai_bitbots',
    symbol: 'ai_bitbots'
  },
  { 
    id: 4, 
    title: 'Money Monsters 3D', 
    image: '/gifs/mm3d.gif',
    magicEdenUrl: 'https://magiceden.io/marketplace/moneymonsters3d',
    tensorUrl: 'https://www.tensor.trade/trade/moneymonsters3d',
    symbol: 'moneymonsters3d'
  },
  { 
    id: 5, 
    title: 'Celeb Catz', 
    image: '/gifs/celebs.gif',
    magicEdenUrl: 'https://magiceden.io/marketplace/celebcatz',
    tensorUrl: 'https://www.tensor.trade/trade/celebcatz',
    symbol: 'celebcatz'
  }
];

const statsCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 60 * 1000 // 1 minute
};

const Collection = () => {
  const [loading, setLoading] = useState(true);
  const [collectionData, setCollectionData] = useState(collections);
  const [solPrice, setSolPrice] = useState(0);
  const [currentTile, setCurrentTile] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState(0);
  const [dragPosition, setDragPosition] = useState(0);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  
  const containerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
      setScreenHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchCollectionData = async () => {
      try {
        setLoading(true);  // Set loading to true when starting fetch
        
        // Check cache first
        const now = Date.now();
        if (statsCache.data && statsCache.timestamp && (now - statsCache.timestamp < statsCache.CACHE_DURATION)) {
          setCollectionData(statsCache.data);
          setLoading(false);  // Set loading to false after setting data
          return;
        }

        const results = await Promise.allSettled(
          collections.map(async (collection) => {
            try {
              const response = await fetch(`${API_BASE_URL}/api/collections/${collection.symbol}/stats`, {
                credentials: 'include',
                headers: {
                  'Accept': 'application/json'
                }
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const data = await response.json();
              
              const floorPriceInSol = Number(data.floorPrice || 0) / 1000000000;
              
              return {
                ...collection,
                floorPrice: isNaN(floorPriceInSol) ? '0.00' : floorPriceInSol.toFixed(2),
                totalSupply: COLLECTION_SUPPLIES[collection.symbol].toLocaleString()
              };
            } catch (error) {
              console.warn(`Failed to fetch ${collection.symbol} data:`, error);
              return {
                ...collection,
                floorPrice: '0.00',
                totalSupply: COLLECTION_SUPPLIES[collection.symbol].toLocaleString()
              };
            }
          })
        );

        const fetchedData = results.map((result, index) => {
          if (result.status === 'fulfilled') {
            return result.value;
          }
          return {
            ...collections[index],
            floorPrice: '0.00',
            totalSupply: COLLECTION_SUPPLIES[collections[index].symbol].toLocaleString()
          };
        });

        // Update cache
        statsCache.data = fetchedData;
        statsCache.timestamp = now;
        
        setCollectionData(fetchedData);
        setLoading(false);  // Set loading to false after setting data
      } catch (error) {
        console.error('Failed to fetch collection data:', error);
        // Use cached data if available, otherwise use default values
        setCollectionData(statsCache.data || collections.map(collection => ({
          ...collection,
          floorPrice: '0.00',
          totalSupply: COLLECTION_SUPPLIES[collection.symbol].toLocaleString()
        })));
        setLoading(false);  // Set loading to false even if there's an error
      }
    };

    fetchCollectionData();
  }, []); // Empty dependency array since we only want to fetch once on mount

  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
        const data = await response.json();
        const price = Number(data.solana?.usd || 0);
        setSolPrice(isNaN(price) ? 0 : price);
      } catch (error) {
        console.error('Error fetching SOL price:', error);
        setSolPrice(0);
      }
    };
    fetchSolPrice();
  }, []);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartPosition(e.touches[0].clientX - dragPosition);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    // Calculate movement with reduced sensitivity
    const currentPosition = e.touches[0].clientX - startPosition;
    const sensitivity = 0.5; // Reduce movement by half
    const maxDrag = 320 * 0.8; // Limit maximum drag distance
    
    // Limit the drag distance and apply sensitivity
    const limitedDrag = Math.max(
      Math.min(currentPosition * sensitivity, maxDrag),
      -maxDrag
    );
    
    setDragPosition(limitedDrag);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const moveThreshold = 320 * 0.3; // Reduce threshold to 30% of tile width
    const movement = dragPosition;

    if (Math.abs(movement) > moveThreshold) {
      if (movement > 0) {
        prevTile();
      } else {
        nextTile();
      }
    }
    
    // Add a small delay before resetting position for smoother transition
    setTimeout(() => {
      setIsDragging(false);
      setDragPosition(0);
    }, 50);
  };

  // Helper to determine how many tiles are visible based on window width breakpoints
  const getVisibleTiles = () => {
    if (window.innerWidth >= 1100) return 3;
    if (window.innerWidth >= 700) return 2;
    return 1;
  };

  // Navigation handlers
  const nextTile = () => {
    const visibleTiles = getVisibleTiles();
    if (currentTile < collectionData.length - visibleTiles) {
      setCurrentTile(currentTile + 1);
    }
  };

  const prevTile = () => {
    if (currentTile > 0) {
      setCurrentTile(currentTile - 1);
    }
  };

  // Calculate the total width for the visible tiles + gaps
  const visibleTiles = getVisibleTiles();
  const tileWidth = screenWidth < 768 ? Math.round(screenWidth * 0.9) : 320;
  const tileGap = 32;
  const wrapperWidth = visibleTiles * tileWidth + (visibleTiles - 1) * tileGap;

  // Calculate the transform so the visible tiles are centered
  const getTransform = () => {
    return `translateX(-${currentTile * (tileWidth + tileGap)}px)`;
  };

  // Set initial tile index to center on load or when visibleTiles changes
  useEffect(() => {
    const visibleTiles = getVisibleTiles();
    const middle = Math.max(0, Math.floor((collectionData.length - visibleTiles) / 2));
    setCurrentTile(middle);
    // eslint-disable-next-line
  }, [screenWidth, screenHeight, collectionData.length]);

  if (loading) {
    return (
      <section id="collection" className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-12 text-center">
            Featured Collections
          </h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="collection" className="bg-black py-12 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-12 text-center">
          Featured Collections
        </h2>
        <div className="relative mx-auto overflow-hidden" style={{ width: wrapperWidth }}>
          <button
            onClick={prevTile}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-200 ${
              currentTile <= 0
                ? 'bg-white/5 cursor-not-allowed'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            disabled={currentTile <= 0}
            style={{ left: 0 }}
          >
            <ChevronLeftIcon className={`h-8 w-8 ${currentTile <= 0 ? 'text-gray-500' : 'text-white'}`} />
          </button>

          <div className="overflow-hidden w-full">
            <div
              className="flex gap-x-8 transition-transform duration-500 ease-in-out"
              style={{
                transform: getTransform(),
                width: tileWidth * collectionData.length + tileGap * (collectionData.length - 1)
              }}
            >
              {collectionData.map((collection, index) => (
                <div
                  key={`${collection.id}-${index}`}
                  className={
                    screenWidth < 768
                      ? 'flex-shrink-0 w-[90vw]'
                      : 'flex-shrink-0 w-[320px]'
                  }
                >
                  <div className="bg-gray-900 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-transform duration-300 hover:shadow-xl p-4 sm:p-6">
                    <div className="aspect-square">
                      <img
                        src={collection.image}
                        alt={collection.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 whitespace-nowrap overflow-hidden text-ellipsis mt-4">
                      {collection.title}
                    </h3>
                    <div className="flex justify-between mb-6">
                      <div>
                        <p className="text-gray-400 text-sm">Floor Price</p>
                        <p className="text-white font-bold">
                          {collection.floorPrice} SOL
                          <span className="text-gray-400 text-sm ml-1">
                            {solPrice > 0 ? (
                              `($${(Number(collection.floorPrice) * solPrice).toFixed(2)})`
                            ) : ''}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">Total Supply</p>
                        <p className="text-white font-bold">{collection.totalSupply}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                      <a
                        href={collection.magicEdenUrl}
                        className="min-w-[120px] w-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full text-white hover:opacity-90 transition-opacity text-center text-sm sm:text-base whitespace-nowrap"
                      >
                        Magic Eden
                      </a>
                      <a
                        href={collection.tensorUrl}
                        className="min-w-[120px] w-full border border-white px-4 py-2 rounded-full text-white hover:bg-white hover:text-black transition-all text-center text-sm sm:text-base whitespace-nowrap"
                      >
                        Tensor
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={nextTile}
            className={`absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-200 ${
              currentTile >= collectionData.length - visibleTiles
                ? 'bg-white/5 cursor-not-allowed'
                : 'bg-white/10 hover:bg-white/20'
            }`}
            disabled={currentTile >= collectionData.length - visibleTiles}
            style={{ right: 0 }}
          >
            <ChevronRightIcon
              className={`h-8 w-8 ${
                currentTile >= collectionData.length - visibleTiles
                  ? 'text-gray-500'
                  : 'text-white'
              }`}
            />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Collection;