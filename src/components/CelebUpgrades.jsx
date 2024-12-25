import { useState, useEffect, useMemo } from 'react';
import { DiscordIcon } from './Icons';

// Cache for storing fetched images
const imageCache = {
  data: null,
  timestamp: null,
  CACHE_DURATION: 5 * 60 * 1000 // 5 minutes
};

const CelebUpgrades = () => {
  const [dbImages, setDbImages] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get the base API URL based on environment
  const API_BASE_URL = import.meta.env.PROD 
    ? '/api' 
    : 'http://localhost:3001/api';

  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Check cache first
        const now = Date.now();
        if (imageCache.data && imageCache.timestamp && (now - imageCache.timestamp < imageCache.CACHE_DURATION)) {
          setDbImages(imageCache.data);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/celebcatz/images`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Update cache
        imageCache.data = data;
        imageCache.timestamp = now;
        
        setDbImages(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching images:', error);
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Memoize the random positions so they don't change on every render
  const images = useMemo(() => 
    dbImages.map((img, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: 0.8 + Math.random() * 0.4,
      rotate: Math.random() * 30 - 15,
      zIndex: Math.floor(Math.random() * 10),
      src: img.image_url
    })), [dbImages]);

  if (error) {
    return (
      <section className="relative bg-black py-16 sm:py-24">
        <div className="text-red-500 text-center">Error loading images: {error}</div>
      </section>
    );
  }

  return (
    <section id="celebupgrades" className="relative bg-black py-16 sm:py-24 overflow-hidden">
      {/* Background images */}
      <div className="absolute inset-0 opacity-20">
        {images.map((img) => (
          <div
            key={img.id}
            className="absolute w-32 h-32 transition-transform duration-[2000ms]"
            style={{
              left: `${img.x}%`,
              top: `${img.y}%`,
              transform: `rotate(${img.rotate}deg) scale(${img.scale})`,
              zIndex: img.zIndex,
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.5s ease-in-out'
            }}
          >
            <img 
              src={img.src}
              alt=""
              className="w-full h-full object-cover rounded-lg hover:opacity-80 transition-opacity"
              loading="lazy"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/fallback-image.png'; // Add a fallback image if needed
              }}
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 pb-2">
            Celeb Upgrades
          </h2>

          <div className="max-w-2xl mb-8">
            <p className="text-xl text-gray-200 mb-4">
              We are now offering free art upgrades on all gen 1 Celebrity Catz (#1-79)
            </p>
          </div>

          <a 
            href="https://discord.gg/your-invite-link" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-3 bg-[#5865F2] px-8 py-3 rounded-full text-white text-lg hover:opacity-90 transition-opacity border-2 border-white/20 shadow-lg"
          >
            <DiscordIcon className="h-6 w-6" />
            <span>Open Support Ticket</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default CelebUpgrades; 