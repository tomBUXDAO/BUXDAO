import { useState, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import ImageCompare from './ImageCompare';
import { API_BASE_URL } from '../config'; // Import API_BASE_URL

const CollabCollections = () => {
  const collabs = [
    {
      name: "A.I. Warriors",
      symbol: "SHxBB", // Database symbol
      magicEdenSymbol: "ai_warriors", // Magic Eden symbol (confirm if different)
      image: "/collab-images/ai-warriors.jpg",
      partner: "Sector H",
      magicEdenUrl: "https://magiceden.io/marketplace/ai_warriors",
      tensorUrl: "https://www.tensor.trade/trade/ai_warriors" // Added Tensor URL
    },
    {
      name: "A.I. Secret Squirrels",
      symbol: "AUSQRL", // Database symbol
      magicEdenSymbol: "ai_secret_squirrels",
      image: "/collab-images/ai-squirrels.jpg",
      partner: "Secret Squirrel Association",
      magicEdenUrl: "https://magiceden.io/marketplace/ai_secret_squirrels",
      tensorUrl: "https://www.tensor.trade/trade/ai_secret_squirrels" // Added Tensor URL
    },
    {
      name: "A.I. Energy Apes",
      symbol: "AELxAIBB", // Database symbol
      magicEdenSymbol: "ai_energy_apes",
      image: "/collab-images/ai-apes.jpg",
      partner: "Ape Energy Labs",
      magicEdenUrl: "https://magiceden.io/marketplace/ai_energy_apes",
      tensorUrl: "https://www.tensor.trade/trade/ai_energy_apes" // Added Tensor URL
    },
    {
      name: "Rejected Bots",
      symbol: "AIRB", // Database symbol
      magicEdenSymbol: "rejected_bots_ryc",
      image: "/collab-images/rejected-bots.jpg",
      partner: "The Rejects",
      magicEdenUrl: "https://magiceden.io/marketplace/rejected_bots_ryc",
      tensorUrl: "https://www.tensor.trade/trade/rejected_bots_ryc" // Added Tensor URL
    },
    {
      name: "CandyBots",
      symbol: "CLB", // Database symbol
      magicEdenSymbol: "candybots",
      image: "/collab-images/candybots.jpg",
      partner: "Candies",
      magicEdenUrl: "https://magiceden.io/marketplace/candybots",
      tensorUrl: "https://www.tensor.trade/trade/candybots" // Added Tensor URL
    },
    {
      name: "DoodleBots",
      symbol: "DDBOT", // Database symbol
      magicEdenSymbol: "doodlebots",
      image: "/collab-images/doodlebots.jpg",
      partner: "Doodle Devils",
      magicEdenUrl: "https://magiceden.io/marketplace/doodlebots",
      tensorUrl: "https://www.tensor.trade/trade/doodlebots" // Added Tensor URL
    }
  ];

  const [collabStats, setCollabStats] = useState({});
  const [hoveredCollab, setHoveredCollab] = useState(null); // Track hovered tile
  const [loadingStats, setLoadingStats] = useState(true); // Loading state for stats

  // Fetch stats for collab collections
  useEffect(() => {
    const fetchCollabStats = async () => {
      setLoadingStats(true);
      const stats = {};

      for (const collab of collabs) {
        try {
          // Use the same backend endpoint as main collections
          const response = await fetch(`${API_BASE_URL}/api/collections/${collab.symbol}/stats`);
          if (response.ok) {
            const data = await response.json();
            stats[collab.symbol] = data;
          } else {
            console.error(`Failed to fetch stats for ${collab.name}:`, response.status);
            stats[collab.symbol] = { totalSupply: 0, listedCount: 0, floorPrice: 0 }; // Default on error
          }
        } catch (error) {
          console.error(`Error fetching stats for ${collab.name}:`, error);
          stats[collab.symbol] = { totalSupply: 0, listedCount: 0, floorPrice: 0 }; // Default on error
        }
      }

      setCollabStats(stats);
      setLoadingStats(false);
    };

    fetchCollabStats();
  }, []); // Fetch stats once on component mount

  return (
    <section id="collabs" className="bg-gradient-to-b from-black to-purple-900 pt-2 pb-16 sm:pt-4 sm:pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-2">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 text-center">
            A.I. Collab Collections
          </h2>

          <div className="w-full max-w-3xl">
            <div className="text-gray-200 text-xl border-2 border-white/20 rounded-2xl py-8 px-6">
              <div className="flex items-start gap-4">
                <SparklesIcon className="w-10 h-10 text-purple-400 flex-shrink-0 mt-1" />
                <div>
                  <p className="mb-4">
                    Periodically we team up with partner projects to produce bonus A.I. generated collections based on the partners original artwork
                  </p>
                  <p className="mb-4">
                    The collections are sent out as free airdrops exclusively to holders of A.I. BitBots and the partner project's community
                  </p>
                  <p>
                    After airdrops are completed, the collection management is passed to the partner project. The NFTs then adopt additional utility within both communities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loadingStats ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-8 justify-center">
            <div className="w-full sm:w-1/2 flex flex-col gap-4">
              {collabs.map((collab) => {
                const stats = collabStats[collab.symbol] || { totalSupply: 0, listedCount: 0, floorPrice: 0 };
                return (
                  <div
                    key={collab.symbol}
                    className="w-full relative" // Added relative for positioning
                    onMouseEnter={() => setHoveredCollab(collab.symbol)} // Set hovered state
                    onMouseLeave={() => setHoveredCollab(null)} // Clear hovered state
                  >
                    <div // Changed from <a> to <div>
                      className={
                        `bg-gray-900 border border-gray-700 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl
                         transition-all duration-300 flex flex-col 
                         ${hoveredCollab === collab.symbol ? 'scale-[1.02] border-purple-500/50' : 'hover:scale-[1.02] hover:border-purple-500/50'}
                         ${hoveredCollab === collab.symbol ? 'h-32' : 'h-16'} // Expand height on hover
                        `
                      }
                      // Removed href, target, rel from here
                    >
                      {/* Original View - Always Visible */}
                      <div className="flex w-full flex-grow-0 flex-shrink-0 h-16">
                         <div className={`w-16 h-16 flex-shrink-0 border-r border-gray-700 ${collab.symbol === 'doodlebots' ? 'bg-black' : ''}`}>
                           <img
                             src={collab.image}
                             alt={collab.name}
                             className="w-full h-full object-cover"
                           />
                         </div>

                         <div className="flex-1 p-2 flex flex-col justify-center">
                           <h3 className="text-sm font-semibold text-gray-200 truncate">
                             {collab.name}
                           </h3>
                           <div className="text-xs text-gray-400">
                             <p className="truncate">Partner: {collab.partner}</p>
                           </div>
                         </div>
                       </div>

                       {/* Expanded Stats and Buttons View (hidden by default, revealed on hover) */}
                       <div className={
                         `w-full px-6 py-2 flex flex-col justify-center transition-all duration-300 overflow-hidden
                          ${hoveredCollab === collab.symbol ? 'h-16 opacity-100 bg-gray-800' : 'h-0 opacity-0 pointer-events-none'}
                         `
                       }>
                         <div className="flex justify-between items-center h-full"> {/* Flex container for stats and buttons */}
                            {/* Stats (Floor Price / Listed Supply) */}
                           <div className="flex flex-col text-sm">
                               <div className="text-gray-400 mb-1">Floor Price</div>
                               <div className="text-white font-bold">
                                 {(stats.floorPrice / 1000000000).toFixed(2)} SOL
                               </div>
                           </div>

                           <div className="flex flex-col text-sm items-end"> {/* Align Listed/Supply to the right */}
                                <div className="text-gray-400 mb-1">Listed/Supply</div>
                                <div className="text-white font-bold">
                                  {stats.listedCount}/{stats.totalSupply}
                                </div>
                           </div>

                           {/* Marketplace Buttons */}
                           <div className="flex space-x-3"> {/* Adjusted spacing */}
                             <a
                               href={collab.magicEdenUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className={
                                 `w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-lg transition-all duration-200 hover:opacity-90
                                  ${hoveredCollab === collab.symbol ? 'border border-blue-400' : ''} // Neon blue border on hover
                                 `
                               } // Small, round button styling with black background and conditional border
                               aria-label="Magic Eden"
                             >
                             <img src="/magic-eden-logo.png" alt="Magic Eden Logo" className="w-6 h-6" /> {/* Adjusted logo size */}
                             </a>
                             <a
                               href={collab.tensorUrl}
                               target="_blank"
                               rel="noopener noreferrer"
                               className={
                                 `w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-lg transition-all duration-200 hover:opacity-90
                                  ${hoveredCollab === collab.symbol ? 'border border-blue-400' : ''} // Neon blue border on hover
                                 `
                               } // Small, round button styling with black background and conditional border
                               aria-label="Tensor"
                             >
                             <img src="/tensor-logo.png" alt="Tensor Logo" className="w-6 h-6" /> {/* Adjusted logo size */}
                             </a>
                           </div>
                         </div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="w-full sm:w-1/2 flex items-center justify-center">
              <ImageCompare className="aspect-square w-[464px]" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CollabCollections;