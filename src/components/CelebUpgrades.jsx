import { useState, useEffect, useMemo, useCallback } from 'react';
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
  const API_BASE_URL = '/api';

  const fetchImages = useCallback(async () => {
    try {
      // Check cache first
      const now = Date.now();
      if (imageCache.data && imageCache.timestamp && (now - imageCache.timestamp < imageCache.CACHE_DURATION)) {
        setDbImages(imageCache.data.filter(img => {
          const num = parseInt(img.name.match(/\d+/)?.[0] || "0");
          return num >= 1 && num <= 79;
        }));
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/celebcatz/images`, {
        headers: {
          'Accept': 'application/json'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        throw new Error('Empty response');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse response:', text);
        throw parseError;
      }

      if (!data || !data.images) {
        throw new Error('Invalid response format');
      }
      
      // Filter for only celebs 1-79
      const filteredImages = data.images.filter(img => {
        const num = parseInt(img.name.match(/\d+/)?.[0] || "0");
        return num >= 1 && num <= 79;
      });
      
      // Update cache
      imageCache.data = filteredImages;
      imageCache.timestamp = now;
      
      setDbImages(filteredImages);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching images:', error);
      setError(error.message);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Memoize the random positions so they don't change on every render
  const images = useMemo(() => 
    dbImages.map((img, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      scale: 0.8 + Math.random() * 0.4,
      rotate: Math.random() * 30 - 15,
      zIndex: Math.floor(Math.random() * 10),
      src: img.image_url,
      name: img.name
    })), [dbImages]);

  return (
    <section id="celebupgrades" className="relative bg-black py-16 sm:py-24 overflow-hidden">
      {!isLoading && (
        <>
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
                  zIndex: img.zIndex
                }}
              >
                <img 
                  src={img.src}
                  alt=""
                  className="w-full h-full object-cover rounded-lg hover:opacity-80 transition-opacity"
                  loading="lazy"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.parentElement.style.display = 'none';
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
                href="https://discord.gg/2dXNjyr593" 
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-3 bg-[#5865F2] px-8 py-3 rounded-full text-white text-lg hover:opacity-90 transition-opacity border-2 border-white/20 shadow-lg"
              >
                <DiscordIcon className="h-6 w-6" />
                <span>Open Support Ticket</span>
              </a>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default CelebUpgrades; 