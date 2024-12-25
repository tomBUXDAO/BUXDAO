import { useState, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import ImageCompare from './ImageCompare';

const CollabCollections = () => {
  const collabs = [
    {
      name: "A.I. Warriors",
      symbol: "ai_warriors",
      image: "/collab-images/ai-warriors.jpg",
      partner: "Sector H",
      magicEdenUrl: "https://magiceden.io/marketplace/ai_warriors"
    },
    {
      name: "A.I. Secret Squirrels",
      symbol: "ai_secret_squirrels",
      image: "/collab-images/ai-squirrels.jpg",
      partner: "Secret Squirrel Association",
      magicEdenUrl: "https://magiceden.io/marketplace/ai_secret_squirrels"
    },
    {
      name: "A.I. Energy Apes",
      symbol: "ai_energy_apes",
      image: "/collab-images/ai-apes.jpg",
      partner: "Ape Energy Labs",
      magicEdenUrl: "https://magiceden.io/marketplace/ai_energy_apes"
    },
    {
      name: "Rejected Bots",
      symbol: "rejected_bots_ryc",
      image: "/collab-images/rejected-bots.jpg",
      partner: "The Rejects",
      magicEdenUrl: "https://magiceden.io/marketplace/rejected_bots_ryc"
    },
    {
      name: "CandyBots",
      symbol: "candybots",
      image: "/collab-images/candybots.jpg",
      partner: "Candies",
      magicEdenUrl: "https://magiceden.io/marketplace/candybots"
    },
    {
      name: "DoodleBots",
      symbol: "doodlebots",
      image: "/collab-images/doodlebots.jpg",
      partner: "Doodle Devils",
      magicEdenUrl: "https://magiceden.io/marketplace/doodlebots"
    }
  ];

  return (
    <section id="collabs" className="bg-gradient-to-b from-black to-purple-900 py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-16">
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

        <div className="flex flex-col sm:flex-row gap-8 justify-center">
          <div className="w-full sm:w-1/2 flex flex-col gap-4">
            {collabs.map((collab) => (
              <div key={collab.symbol} className="w-full">
                <a 
                  href={collab.magicEdenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gray-900 border border-gray-700 backdrop-blur-sm rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-purple-500/50 flex h-16"
                >
                  <div className={`w-16 h-16 flex-shrink-0 border-r border-gray-700 ${
                    collab.symbol === 'doodlebots' ? 'bg-black' : ''
                  }`}>
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
                </a>
              </div>
            ))}
          </div>

          <div className="w-full sm:w-1/2 flex items-center justify-center">
            <ImageCompare className="aspect-square w-[464px]" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CollabCollections; 