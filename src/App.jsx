import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { useMemo } from 'react';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import Header from './components/Header';
import Hero from './components/Hero';
import Collection from './components/Collection';
import CollabCollections from './components/CollabCollections';
import CelebUpgrades from './components/CelebUpgrades';
import Merch from './pages/Merch';
import Roadmap from './pages/Roadmap';
import Bux from './pages/Bux';
import HolderVerification from './components/HolderVerification';

// Import styles
import '@solana/wallet-adapter-react-ui/styles.css';
import './index.css';

function App() {
  // Configure Solana network and wallet
  const network = WalletAdapterNetwork.MainnetBeta;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter({ network }),
      new SolflareWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <Router>
            <div className="min-h-screen bg-black">
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
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App; 