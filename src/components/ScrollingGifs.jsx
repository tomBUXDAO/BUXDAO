const ScrollingGifs = () => {
  const gifs = [
    '/gifs/bitbot.gif',
    '/gifs/catz.gif',
    '/gifs/celebs.gif',
    '/gifs/mm.gif',
    '/gifs/mm3d.gif'
  ];

  return (
    <section className="bg-black py-16 overflow-hidden border-t border-b border-gray-800">
      <div className="relative">
        <div className="flex animate-scroll gap-12 whitespace-nowrap">
          {[...gifs, ...gifs].map((gif, index) => (
            <div 
              key={index} 
              className="w-72 h-72 flex-shrink-0 rounded-xl overflow-hidden bg-gray-900 shadow-xl transform hover:scale-105 transition-transform duration-300"
            >
              <img 
                src={gif} 
                alt={`BUXDAO NFT ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ScrollingGifs; 