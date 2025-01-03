import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState, useEffect, useRef } from 'react';

const COLLECTION_SUPPLIES = {
  fcked_catz: 1184,
  celebcatz: 124,
  money_monsters: 623,
  moneymonsters3d: 647,
  ai_bitbots: 205
};

// Get the base API URL based on environment
const API_BASE_URL = '/api';  // This will work both locally and in production

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

const Collection = () => {
  const [loading, setLoading] = useState(true);
  const [collectionData, setCollectionData] = useState(collections);
  const [solPrice, setSolPrice] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPosition, setStartPosition] = useState(0);
  const [dragPosition, setDragPosition] = useState(0);
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [screenHeight, setScreenHeight] = useState(window.innerHeight);
  
  const containerRef = useRef(null);
  const tileWidth = useRef(0);

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
        const fetchedData = await Promise.all(
          collections.map(async (collection) => {
            const response = await fetch(`${API_BASE_URL}/collections/${collection.symbol}/stats`);
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
          })
        );
        setCollectionData(fetchedData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching collection data:', error);
        setCollectionData(collections.map(collection => ({
          ...collection,
          floorPrice: '0.00',
          totalSupply: COLLECTION_SUPPLIES[collection.symbol].toLocaleString()
        })));
        setLoading(false);
      }
    };

    fetchCollectionData();
  }, []);

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

  useEffect(() => {
    if (containerRef.current) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isPortrait = screenHeight > screenWidth;
      let initialOffset;
      
      if (screenWidth < 768) {  // Mobile
        initialOffset = 0;  // Single tile centered
      } else if (screenWidth < 1024 && isPortrait) {  // Tablet portrait only
        initialOffset = window.innerWidth * 0.9;  // Show tiles 2 and 3 (MM and BitBots)
      } else {  // Desktop and tablet landscape
        const containerWidth = containerRef.current.offsetWidth;
        const tileWidth = containerWidth / 3;
        initialOffset = tileWidth;  // Show second set of tiles
      }
      
      setCurrentIndex(initialOffset);
    }
  }, [loading]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartPosition(e.touches[0].clientX - dragPosition);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    // Calculate movement with reduced sensitivity
    const currentPosition = e.touches[0].clientX - startPosition;
    const sensitivity = 0.5; // Reduce movement by half
    const maxDrag = tileWidth.current * 0.8; // Limit maximum drag distance
    
    // Limit the drag distance and apply sensitivity
    const limitedDrag = Math.max(
      Math.min(currentPosition * sensitivity, maxDrag),
      -maxDrag
    );
    
    setDragPosition(limitedDrag);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const moveThreshold = tileWidth.current * 0.3; // Reduce threshold to 30% of tile width
    const movement = dragPosition;

    if (Math.abs(movement) > moveThreshold) {
      if (movement > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    }
    
    // Add a small delay before resetting position for smoother transition
    setTimeout(() => {
      setIsDragging(false);
      setDragPosition(0);
    }, 50);
  };

  const moveOneSlide = (direction) => {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isPortrait = screenHeight > screenWidth;
    let moveDistance;
    
    if (screenWidth < 768) {  // Mobile
      moveDistance = screenWidth * 0.9;  // 90vw to match tile width
    } else if (screenWidth < 1024 && isPortrait) {  // Tablet portrait only
      moveDistance = window.innerWidth * 0.9;  // Move by one 90vw tile
    } else {  // Desktop and tablet landscape
      moveDistance = containerRef.current.offsetWidth / 3;
    }
    
    setCurrentIndex((prevIndex) => {
      const newIndex = direction === 'next' ? prevIndex + moveDistance : prevIndex - moveDistance;
      const fullWidth = window.innerWidth * 0.9 * 5;  // 5 tiles at 90vw each
      
      if (newIndex >= fullWidth) {
        return 0;
      }
      if (newIndex < 0) {
        return fullWidth - moveDistance;
      }
      
      return newIndex;
    });
  };

  const nextSlide = () => {
    moveOneSlide('next');
  };

  const prevSlide = () => {
    moveOneSlide('prev');
  };

  const repeatedCollections = [...collectionData, ...collectionData, ...collectionData]; // 15 items

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
        
        <div className="relative max-w-7xl mx-auto overflow-hidden">
          <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full hover:bg-white/20">
            <ChevronLeftIcon className="h-8 w-8 text-white" />
          </button>

          <div className="overflow-hidden" ref={containerRef}>
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${currentIndex}px)`,
                width: '500%',
                marginLeft: screenWidth < 1024 && screenHeight > screenWidth ? '0' : 'auto'
              }}
            >
              {repeatedCollections.map((collection, index) => (
                <div 
                  key={`${collection.id}-${index}`} 
                  className="min-w-[90vw] px-4 py-4 md:min-w-[320px] lg:w-1/3"
                >
                  <div className="bg-gray-900 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-transform duration-300 hover:shadow-xl">
                    <div className="aspect-square">
                      <img 
                        src={collection.image} 
                        alt={collection.title}
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="p-4 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-semibold text-white mb-4 whitespace-nowrap overflow-hidden text-ellipsis">
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
                </div>
              ))}
            </div>
          </div>

          <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 p-2 rounded-full hover:bg-white/20">
            <ChevronRightIcon className="h-8 w-8 text-white" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Collection; 