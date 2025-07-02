import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, XMarkIcon, LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import Logo from './Logo';
import { useUser } from '../contexts/UserContext';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { DiscordIcon } from './Icons';
import XIcon from './XIcon';
import { API_BASE_URL } from '../config';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { discordUser, handleLogout, walletConnected, walletAddress } = useUser();
  const { setVisible } = useWalletModal();
  const walletAdapter = useWallet();
  const [userWallets, setUserWallets] = useState([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  const mainLinks = [
    { name: 'Spades', href: '/spades' },
    { name: 'Poker', href: '/poker' },
    { name: 'Merch', href: '/merch' }
  ];

  // Fetch wallets when dropdown opens
  useEffect(() => {
    if (isUserDropdownOpen && discordUser) {
      setWalletsLoading(true);
      fetch(`${API_BASE_URL}/api/user/wallets`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setUserWallets(data.wallets || []);
        })
        .catch(() => setUserWallets([]))
        .finally(() => setWalletsLoading(false));
    }
  }, [isUserDropdownOpen, discordUser]);

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
                    {/* Home link */}
                    <Link
                      to="/"
                      onClick={() => setIsMenuOpen(false)}
                      className="-m-3 block rounded-md p-3 text-base font-medium text-gray-300 hover:text-[#5865F2] transition-colors"
                    >
                      Home
                    </Link>

                    {/* BUX link */}
                    <Link
                      to="/bux"
                      onClick={() => setIsMenuOpen(false)}
                      className="-m-3 block rounded-md p-3 text-base font-medium text-gray-300 hover:text-[#5865F2] transition-colors"
                    >
                      $BUX
                    </Link>

                    {/* Main links */}
                    {mainLinks.map((link) => (
                      <Link
                        key={link.name}
                        to={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="-m-3 block rounded-md p-3 text-base font-medium text-gray-300 hover:text-[#5865F2] transition-colors"
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
                        className="text-gray-400 hover:text-[#5865F2]"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="sr-only">X (Twitter)</span>
                        <XIcon className="h-6 w-6" />
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
                      if (!discordUser) {
                        window.location.href = '/verify';
                      } else {
                        setVisible(true);
                      }
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
              {/* Home link */}
              <Link 
                to="/"
                className="text-gray-300 hover:text-[#5865F2] transition-colors"
              >
                Home
              </Link>

              {/* BUX link */}
              <Link 
                to="/bux"
                className="text-gray-300 hover:text-[#5865F2] transition-colors"
              >
                $BUX
              </Link>

              {/* Main links in desktop menu */}
              {mainLinks.map((link) => (
                <Link 
                  key={link.name}
                  to={link.href} 
                  className="text-gray-300 hover:text-[#5865F2] transition-colors"
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
                className="text-gray-300 hover:text-[#5865F2] transition-colors flex items-center"
                title="Follow us on X"
              >
                <XIcon className="h-6 w-6" />
              </a>

              {/* User section */}
              {discordUser ? (
                <div 
                  className="relative"
                  onMouseEnter={() => setIsUserDropdownOpen(true)}
                  onMouseLeave={() => setIsUserDropdownOpen(false)}
                >
                  <button className="flex items-center space-x-3 text-gray-300 hover:text-[#5865F2] transition-colors py-2">
                    <img 
                      src={`https://cdn.discordapp.com/avatars/${discordUser.discord_id}/${discordUser.avatar}.png`}
                      alt={discordUser.discord_username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm">{discordUser.discord_username}</span>
                  </button>
                  {/* User Dropdown menu */}
                  <div 
                    className={`absolute right-0 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 transform transition-all duration-200 origin-top ${
                      isUserDropdownOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
                    }`}
                  >
                    <div className="py-1" role="menu" aria-orientation="vertical">
                      {/* Wallet list */}
                      {walletsLoading ? (
                        <div className="px-4 py-2 text-sm text-gray-400">Loading wallets...</div>
                      ) : userWallets.length > 0 ? (
                        <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-800">
                          <div className="font-semibold mb-1">Wallets</div>
                          {userWallets.map(addr => (
                            <div key={addr} className="flex items-center space-x-2 truncate">
                              <span className="truncate">{addr.slice(0, 4)}...{addr.slice(-4)}</span>
                              {walletAdapter.publicKey && addr === walletAdapter.publicKey.toBase58() ? (
                                <span className="text-green-400">&#10003;</span>
                              ) : (
                                <span className="text-red-400">&#10007;</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {/* Logout/Connect option */}
                      {walletConnected ? (
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:text-[#5865F2] hover:bg-gray-800 w-full text-left transition-colors"
                          role="menuitem"
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4" />
                          <span>Logout</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!discordUser) {
                              window.location.href = '/verify';
                            } else {
                              setVisible(true);
                            }
                          }}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:text-[#5865F2] hover:bg-gray-800 w-full text-left transition-colors"
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
                  onClick={() => {
                    if (!discordUser) {
                      window.location.href = '/verify';
                    } else {
                      setVisible(true);
                    }
                  }}
                  className="text-gray-300 hover:text-[#5865F2] transition-colors py-2"
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