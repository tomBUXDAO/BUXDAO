import { useState } from 'react';
import Logo from './Logo';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed w-full bg-black/80 backdrop-blur-sm z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Logo />
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              <a href="#home" className="text-gray-300 hover:text-white transition-colors">
                Home
              </a>
              <a href="#collection" className="text-gray-300 hover:text-white transition-colors">
                Collection
              </a>
              <a href="#roadmap" className="text-gray-300 hover:text-white transition-colors">
                Roadmap
              </a>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white hover:opacity-90 transition-opacity">
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 