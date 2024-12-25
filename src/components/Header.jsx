import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHomeDropdownOpen, setIsHomeDropdownOpen] = useState(false);
  const [isMerchDropdownOpen, setIsMerchDropdownOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const section = document.querySelector(sectionId);
    if (section) {
      const headerHeight = document.querySelector('header').offsetHeight;
      const sectionPosition = section.getBoundingClientRect().top;
      const offsetPosition = sectionPosition + window.pageYOffset - headerHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const sections = [
    { name: 'Collections', href: '#collection' },
    { name: '$BUX', href: '#bux' },
    { name: 'A.I. Collabs', href: '#collabs' },
    { name: 'Celeb Upgrades', href: '#celebupgrades' }
  ];

  const merchSections = [
    { name: 'Hats', href: '/merch/hats' },
    { name: 'Hoodies', href: '/merch/hoodies' },
    { name: 'T-Shirts', href: '/merch/t-shirts' },
    { name: 'Check Out', href: '/merch/checkout' }
  ];

  const mainLinks = [
    { name: 'Rewards', href: '/rewards' },
    { name: 'Stats', href: '/stats' },
    { name: 'Coming Soon', href: '/soon' }
  ];

  return (
    <header className="fixed w-full bg-black/80 backdrop-blur-sm z-50">
      <nav className="max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-shrink-0 -ml-2 sm:ml-0">
            <Link to="/">
              <Logo />
            </Link>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-8">
              {/* Home with dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setIsHomeDropdownOpen(true)}
                onMouseLeave={() => setIsHomeDropdownOpen(false)}
              >
                <Link 
                  to="/"
                  className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors py-2"
                  onClick={(e) => {
                    setIsHomeDropdownOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span>Home</span>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${isHomeDropdownOpen ? 'rotate-180' : ''}`} />
                </Link>
                
                {/* Home Dropdown menu */}
                <div 
                  className={`absolute left-0 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top ${
                    isHomeDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {sections.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        role="menuitem"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsHomeDropdownOpen(false);
                          scrollToSection(item.href);
                        }}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main links before Merch */}
              {mainLinks.map((link) => (
                <Link 
                  key={link.name}
                  to={link.href} 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}

              {/* Merch with dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setIsMerchDropdownOpen(true)}
                onMouseLeave={() => setIsMerchDropdownOpen(false)}
              >
                <Link 
                  to="/merch"
                  className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <span>Merch</span>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${isMerchDropdownOpen ? 'rotate-180' : ''}`} />
                </Link>
                
                {/* Merch Dropdown menu */}
                <div 
                  className={`absolute left-0 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top ${
                    isMerchDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {merchSections.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        role="menuitem"
                        onClick={() => setIsMerchDropdownOpen(false)}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white hover:opacity-90 transition-opacity">
                Connect Wallet
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4">
            <div className="flex flex-col space-y-4">
              {/* Home sections in mobile */}
              <div className="space-y-2">
                <Link 
                  to="/"
                  className="text-sm font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                  onClick={(e) => {
                    setIsMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Home
                </Link>
                {sections.map(item => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block text-gray-300 hover:text-white transition-colors pl-4"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMenuOpen(false);
                      scrollToSection(item.href);
                    }}
                  >
                    {item.name}
                  </a>
                ))}
              </div>

              {/* Main links */}
              {mainLinks.map(link => (
                <Link 
                  key={link.name}
                  to={link.href} 
                  className="text-gray-300 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              
              {/* Merch sections in mobile */}
              <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Merch</div>
                {merchSections.map(item => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="block text-gray-300 hover:text-white transition-colors pl-4"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white hover:opacity-90 transition-opacity">
                Connect Wallet
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header; 