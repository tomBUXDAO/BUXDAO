import { useState, useRef, useEffect } from 'react';

const ImageCompare = () => {
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleMouseMove = (e) => {
    if (!isResizing || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const containerWidth = container.offsetWidth;

    const newPosition = Math.min(Math.max((x / containerWidth) * 100, 0), 100);
    setPosition(newPosition);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isResizing]);

  return (
    <div 
      ref={containerRef}
      className="relative aspect-square w-full select-none border border-gray-700 rounded-lg overflow-hidden"
      onMouseDown={handleMouseDown}
    >
      {/* After Image (Background) */}
      <div className="absolute inset-0">
        <img 
          src="/rejects-after.jpg" 
          alt="After" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Before Image (Overlay with clip) */}
      <div 
        className="absolute inset-0"
        style={{ 
          clipPath: `inset(0 ${100 - position}% 0 0)` 
        }}
      >
        <img 
          src="/rejects-before.jpg" 
          alt="Before" 
          className="w-full h-full object-cover"
        />
      </div>

      {/* Slider Line */}
      <div 
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      >
        {/* Slider Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-gray-500"></div>
            <div className="w-0.5 h-4 bg-gray-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCompare; 