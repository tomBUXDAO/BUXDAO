import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, ChevronDownIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';
import { useUser } from '../contexts/UserContext';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { DiscordIcon } from './Icons';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHomeDropdownOpen, setIsHomeDropdownOpen] = useState(false);
  const [isBuxDropdownOpen, setIsBuxDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { discordUser, handleLogout, walletConnected, walletAddress } = useUser();
  const { setVisible } = useWalletModal();

  const scrollToSection = (sectionId) => {
    setTimeout(() => {
      const section = document.querySelector(sectionId);
      if (section) {
        const headerOffset = 80; // Height of fixed header
        const elementPosition = section.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100); // Small delay to ensure DOM is ready
  };

  const sections = [
    { name: 'Collections', href: '#collection' },
    { name: 'A.I. Collabs', href: '#collabs' },
    { name: 'Celeb Upgrades', href: '#celebupgrades' }
  ];

  const buxSections = [
    { 
      name: 'Rewards', 
      href: '/bux',
      onClick: () => {
        if (window.location.pathname !== '/bux') {
          window.location.href = '/bux?section=rewards';
        } else {
          scrollToSection('#rewards');
        }
      }
    },
    { 
      name: 'Profile', 
      href: '/bux',
      onClick: () => {
        if (window.location.pathname !== '/bux') {
          window.location.href = '/bux?section=mybux';
        } else {
          scrollToSection('#mybux');
        }
      },
      locked: true
    }
  ];

  const mainLinks = [
    { name: 'Roadmap', href: '/roadmap' },
    { name: 'Merch', href: '/merch' }
  ];

  // Add effect to handle URL parameters on BUX page load
  useEffect(() => {
    if (window.location.pathname === '/bux') {
      const params = new URLSearchParams(window.location.search);
      const section = params.get('section');
      if (section === 'rewards') {
        scrollToSection('#rewards');
      } else if (section === 'mybux') {
        scrollToSection('#mybux');
      }
    }
  }, [window.location.search]);

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

          {/* Mobile menu panel */}
          <div 
            className={`fixed inset-x-0 top-0 origin-top-right transform p-2 transition duration-200 ease-out md:hidden ${
              isMenuOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
            }`}
          >
            <div className="rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 bg-gray-900 divide-y divide-gray-800">
              <div className="pt-5 pb-6 px-5">
                <div className="flex items-center justify-between">
                  <Link to="/" onClick={() => setIsMenuOpen(false)}>
                    <Logo />
                  </Link>
                  <div className="-mr-2">
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                    >
                      <span className="sr-only">Close menu</span>
                      <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <div className="mt-6">
                  <nav className="grid gap-y-8">
                    {/* Home with collapsible submenu */}
                    <div>
                      <button
                        onClick={() => {
                          setIsHomeDropdownOpen(!isHomeDropdownOpen);
                          setIsBuxDropdownOpen(false); // Close BUX menu
                        }}
                        className="-m-3 flex items-center justify-between rounded-md p-3 text-gray-300 hover:bg-gray-800 w-full"
                      >
                        <span className="text-base font-medium text-white">Home</span>
                        <ChevronDownIcon className={`h-5 w-5 transform ${isHomeDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {/* Home Submenu */}
                      <div 
                        className={`ml-4 mt-2 space-y-2 ${isHomeDropdownOpen ? 'block' : 'hidden'}`}
                      >
                        {sections.map((item) => (
                          <Link
                            key={item.name}
                            to="/"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMenuOpen(false);
                              setIsHomeDropdownOpen(false);
                              if (window.location.pathname !== '/') {
                                window.location.href = '/#' + item.href.substring(1);
                              } else {
                                scrollToSection(item.href);
                              }
                            }}
                            className="-m-3 block rounded-md p-3 text-sm font-medium text-gray-400 hover:bg-gray-800"
                          >
                            {item.name}
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* $BUX with collapsible submenu */}
                    <div>
                      <button
                        onClick={() => {
                          setIsBuxDropdownOpen(!isBuxDropdownOpen);
                          setIsHomeDropdownOpen(false); // Close Home menu
                        }}
                        className="-m-3 flex items-center justify-between rounded-md p-3 text-gray-300 hover:bg-gray-800 w-full"
                      >
                        <span className="text-base font-medium text-white">$BUX</span>
                        <ChevronDownIcon className={`h-5 w-5 transform ${isBuxDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {/* $BUX Submenu */}
                      <div 
                        className={`ml-4 mt-2 space-y-2 ${isBuxDropdownOpen ? 'block' : 'hidden'}`}
                      >
                        {buxSections.map((item) => (
                          <Link
                            key={item.name}
                            to={item.href}
                            onClick={(e) => {
                              e.preventDefault();
                              setIsMenuOpen(false);
                              setIsBuxDropdownOpen(false);
                              if (item.onClick) {
                                item.onClick();
                              }
                            }}
                            className="-m-3 block rounded-md p-3 text-sm font-medium text-gray-400 hover:bg-gray-800"
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

                    {/* Main links */}
                    {mainLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="-m-3 block rounded-md p-3 text-base font-medium text-white hover:bg-gray-800"
                      >
                        {link.name}
                      </Link>
                    ))}

                    {/* Social links */}
                    <div className="mt-6 pt-6 border-t border-gray-800 flex justify-center space-x-6">
                      <a
                        href="https://discord.gg/2dXNjyr593"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-[#5865F2]"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="sr-only">Discord</span>
                        <DiscordIcon className="h-6 w-6" />
                      </a>
                      <a
                        href="https://x.com/buxdao"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:opacity-80"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="sr-only">X (Twitter)</span>
                        <img src="/x-logo.png" alt="X logo" className="h-6 w-6 object-contain" />
                      </a>
                    </div>
                  </nav>
                </div>
              </div>

              {/* Wallet/User section for mobile */}
              <div className="py-6 px-5">
                {discordUser ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
                        alt={discordUser.discord_username}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-base font-medium text-white">{discordUser.discord_username}</span>
                    </div>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <span className="sr-only">Logout</span>
                      <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setVisible(true);
                      setIsMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-purple-600 hover:bg-purple-700"
                  >
                    <LockClosedIcon className="-ml-1 mr-2 h-5 w-5 text-white" aria-hidden="true" />
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
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
                        onClick={(e) => {
                          e.preventDefault();
                          setIsBuxDropdownOpen(false);
                          if (item.onClick) {
                            item.onClick();
                          }
                        }}
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

              {/* Social links */}
              <a
                href="https://discord.gg/2dXNjyr593"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-[#5865F2] transition-colors flex items-center"
                title="Join us on Discord"
              >
                <DiscordIcon className="h-6 w-6" />
              </a>
              <a
                href="https://x.com/buxdao"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:opacity-80 transition-colors flex items-center"
                title="Follow us on X"
              >
                <img src="/x-logo.png" alt="X logo" className="h-8 w-8 object-contain" />
              </a>

              {/* User section */}
              {discordUser ? (
                <div 
                  className="relative"
                  onMouseEnter={() => setIsUserDropdownOpen(true)}
                  onMouseLeave={() => setIsUserDropdownOpen(false)}
                >
                  <button className="flex items-center space-x-3 text-gray-300 hover:text-white py-2">
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
                      alt={discordUser.discord_username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm">{discordUser.discord_username}</span>
                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {/* User Dropdown menu */}
                  <div 
                    className={`absolute right-0 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top ${
                      isUserDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      {walletConnected ? (
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full text-left"
                          role="menuitem"
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setVisible(true)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full text-left"
                          role="menuitem"
                        >
                          <LockClosedIcon className="h-4 w-4" />
                          <span>Connect Wallet</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setVisible(true)}
                  className="text-gray-300 hover:text-white transition-colors py-2"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header; 