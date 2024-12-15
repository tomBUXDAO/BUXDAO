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
const API_BASE_URL = import.meta.env.PROD 
  ? '/api' 
  : 'http://localhost:3001/api';

const Collection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [collectionData, setCollectionData] = useState([]);
  const [solPrice, setSolPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);

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

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex - 1;
      return newIndex < 0 ? collectionData.length - 1 : newIndex;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => {
      const newIndex = prevIndex + 1;
      return newIndex >= collectionData.length ? 0 : newIndex;
    });
  };

  // Handle touch events
  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (Math.abs(distance) < minSwipeDistance) return;

    if (distance > 0) {
      // Swiped left
      nextSlide();
    } else {
      // Swiped right
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  // Handle scroll events
  const handleWheel = (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      if (e.deltaX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  if (loading) {
    return (
      <section id="collection" className="bg-black py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
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
        <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-8 sm:mb-12">
          Featured Collections
        </h2>
        
        <div 
          ref={containerRef}
          className="relative touch-pan-x"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="relative">
            <button 
              onClick={prevSlide}
              className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all duration-300"
            >
              <ChevronLeftIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 transition-all duration-500 ease-in-out">
              {[...collectionData, ...collectionData].slice(
                currentIndex,
                currentIndex + (window.innerWidth >= 1024 ? 3 : 2)
              ).map((collection) => (
                <div key={`${collection.id}-${currentIndex}`} className="bg-gray-900 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-transform duration-300">
                  <div className="aspect-square">
                    <img 
                      src={collection.image} 
                      alt={collection.title}
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="p-4 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-semibold text-white mb-4">{collection.title}</h3>
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
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-full text-white hover:opacity-90 transition-opacity text-center text-sm sm:text-base"
                      >
                        Magic Eden
                      </a>
                      <a 
                        href={collection.tensorUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full border border-white px-4 py-2 rounded-full text-white hover:bg-white hover:text-black transition-all text-center text-sm sm:text-base"
                      >
                        Tensor
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={nextSlide}
              className="hidden sm:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all duration-300"
            >
              <ChevronRightIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Collection; 