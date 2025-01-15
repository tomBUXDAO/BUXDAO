import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

// Import your components
import Header from './components/Header';
import Hero from './components/Hero';
import Collection from './components/Collection';
import CollabCollections from './components/CollabCollections';
import CelebUpgrades from './components/CelebUpgrades';
import Merch from './pages/Merch';
import Roadmap from './pages/Roadmap';
import Bux from './pages/Bux';
import HolderVerification from './components/HolderVerification';
import { UserProvider } from './contexts/UserContext';

// Import your styles
import './index.css';

// Add custom styles for the wallet modal
const modalStyles = {
  '.wallet-adapter-modal-wrapper': {
    position: 'relative',
  },
  '.wallet-adapter-modal-close-button': {
    position: 'absolute',
    top: '16px',
    right: '16px',
    padding: '8px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    opacity: '0.6',
    transition: 'opacity 0.15s',
    '&:hover': {
      opacity: '1',
    },
  },
};

const App = () => {
  // You can also provide a custom RPC endpoint
  const network = WalletAdapterNetwork.Mainnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Remove explicit wallet adapters and let standard adapters handle it
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <style>
            {`
              .wallet-adapter-modal-wrapper {
                position: relative !important;
              }
              .wallet-adapter-modal-close-button {
                position: absolute !important;
                top: 16px !important;
                right: 16px !important;
                padding: 8px !important;
                cursor: pointer !important;
                background-color: transparent !important;
                border: none !important;
                color: #fff !important;
                opacity: 0.6 !important;
                transition: opacity 0.15s !important;
              }
              .wallet-adapter-modal-close-button:hover {
                opacity: 1 !important;
              }
              .wallet-adapter-modal-close-button svg {
                width: 24px !important;
                height: 24px !important;
              }
            `}
          </style>
          <UserProvider>
            <Router>
              <div className="min-h-screen bg-black text-white">
                <Header />
                <Routes>
                  <Route path="/" element={
                    <>
                      <Hero />
                      <Collection />
                      <CollabCollections />
                      <CelebUpgrades />
                    </>
                  } />
                  <Route path="/merch" element={<Merch />} />
                  <Route path="/roadmap" element={<Roadmap />} />
                  <Route path="/bux" element={<Bux />} />
                  <Route path="/verify" element={<HolderVerification />} />
                </Routes>
              </div>
            </Router>
          </UserProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default App; 