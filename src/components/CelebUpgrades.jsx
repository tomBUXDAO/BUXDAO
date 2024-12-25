import { useState, useEffect, useMemo } from 'react';
import { DiscordIcon } from './Icons';

const CelebUpgrades = () => {
  const [dbImages, setDbImages] = useState([]);
  const [error, setError] = useState(null);

  // Get the base API URL based on environment
  const API_BASE_URL = import.meta.env.PROD 
    ? '/api' 
    : 'http://localhost:3001/api';

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/celebcatz/images`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setDbImages(data);
      } catch (error) {
        console.error('Error fetching images:', error);
        setError(error.message);
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
    console.log('Rendering error state:', error);
  }

  return (
    <section className="relative bg-black py-16 sm:py-24 overflow-hidden">
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
            />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 leading-normal">
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