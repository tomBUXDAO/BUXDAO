import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';
import { useUser } from '../contexts/UserContext';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHomeDropdownOpen, setIsHomeDropdownOpen] = useState(false);
  const [isBuxDropdownOpen, setIsBuxDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { discordUser, handleLogout, walletConnected, walletAddress } = useUser();
  const { setVisible } = useWalletModal();

  const scrollToSection = (sectionId) => {
    const section = document.querySelector(sectionId);
    if (section) {
      const offset = sectionId === '#collection' ? 40 : 0;
      window.scrollTo({ 
        top: section.offsetTop - offset, 
        behavior: 'smooth' 
      });
    }
  };

  const sections = [
    { name: 'Collections', href: '#collection' },
    { name: 'A.I. Collabs', href: '#collabs' },
    { name: 'Celeb Upgrades', href: '#celebupgrades' }
  ];

  const buxSections = [
    { name: 'Rewards', href: '/rewards' },
    { 
      name: 'Profile', 
      href: '/profile',
      locked: true
    }
  ];

  const mainLinks = [
    { name: 'Roadmap', href: '/roadmap' },
    { name: 'Merch', href: '/merch' }
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
                        to="/"
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        role="menuitem"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsHomeDropdownOpen(false);
                          if (window.location.pathname !== '/') {
                            window.location.href = '/#' + item.href.substring(1);
                          } else {
                            scrollToSection(item.href);
                          }
                        }}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* $BUX with dropdown */}
              <div 
                className="relative group"
                onMouseEnter={() => setIsBuxDropdownOpen(true)}
                onMouseLeave={() => setIsBuxDropdownOpen(false)}
              >
                <Link 
                  to="/bux"
                  className="flex items-center space-x-1 text-gray-300 hover:text-white transition-colors py-2"
                >
                  <span>$BUX</span>
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${isBuxDropdownOpen ? 'rotate-180' : ''}`} />
                </Link>
                
                {/* $BUX Dropdown menu */}
                <div 
                  className={`absolute left-0 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top ${
                    isBuxDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {buxSections.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                        role="menuitem"
                        onClick={() => setIsBuxDropdownOpen(false)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{item.name}</span>
                          {item.locked && (
                            <LockClosedIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main links in desktop menu */}
              {mainLinks.map((link) => (
                <Link 
                  key={link.name}
                  to={link.href} 
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}

              {/* User section */}
              {discordUser ? (
                <div 
                  className="relative"
                  onMouseEnter={() => setIsUserDropdownOpen(true)}
                  onMouseLeave={() => setIsUserDropdownOpen(false)}
                >
                  <button className="flex items-center space-x-3 text-gray-300 hover:text-white">
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
                      alt={discordUser.discord_username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm">{discordUser.discord_username}</span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* User Dropdown */}
                  <div 
                    className={`absolute right-0 w-48 mt-2 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top ${
                      isUserDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    <div className="py-1">
                      {walletConnected ? (
                        <div className="px-4 py-2 text-sm">
                          <p className="text-gray-400">Wallet</p>
                          <p className="text-gray-300 truncate">{walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setVisible(true)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                        >
                          Connect Wallet
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/verify">
                  <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white hover:opacity-90 transition-opacity">
                    Connect Wallet
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden mt-6 pb-6">
            <div className="flex flex-col space-y-6">
              {/* Home sections in mobile */}
              <div className="space-y-4">
                <Link 
                  to="/"
                  className="block text-sm font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                  onClick={(e) => {
                    setIsMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  HOME
                </Link>
                {sections.map(item => (
                  <a
                    key={item.name}
                    href={item.href}
                    className="block text-gray-300 hover:text-white transition-colors pl-4 text-sm tracking-wide"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsMenuOpen(false);
                      if (window.location.pathname !== '/') {
                        window.location.href = '/#' + item.href.substring(1);
                      } else {
                        scrollToSection(item.href);
                      }
                    }}
                  >
                    {item.name}
                  </a>
                ))}
              </div>

              {/* $BUX sections in mobile */}
              <div className="space-y-4">
                <Link
                  to="/bux"
                  className="text-sm font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  $BUX
                </Link>
                {buxSections.map(item => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="block text-gray-300 hover:text-white transition-colors pl-4 text-sm tracking-wide"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.locked && (
                        <LockClosedIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                  </Link>
                ))}
              </div>

              {/* Main links in mobile menu */}
              {mainLinks.map(link => (
                <Link 
                  key={link.name}
                  to={link.href} 
                  className="text-sm font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name.toUpperCase()}
                </Link>
              ))}

              {/* User section in mobile */}
              {discordUser ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
                      alt={discordUser.discord_username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm text-gray-300">{discordUser.discord_username}</span>
                  </div>
                  {walletConnected ? (
                    <div className="pl-11">
                      <p className="text-gray-400 text-xs">Wallet</p>
                      <p className="text-gray-300 text-sm truncate">{walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setVisible(true);
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left pl-11 text-sm text-gray-300"
                    >
                      Connect Wallet
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex items-center space-x-2 w-full text-left pl-11 text-sm text-gray-300"
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <Link 
                  to="/verify"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 rounded-full text-white hover:opacity-90 transition-opacity text-sm tracking-wide">
                    Connect Wallet
                  </button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header; 