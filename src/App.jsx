import React, { useMemo } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { WalletContextProvider } from './contexts/WalletContext';
import { Toaster } from 'react-hot-toast';
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
import { Routes, Route } from 'react-router-dom';

// Import your styles
import './index.css';

const App = () => {
  return (
    <Router>
      <WalletContextProvider>
        <UserProvider>
          <div className="min-h-screen bg-black text-white">
            <Toaster position="top-right" />
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
        </UserProvider>
      </WalletContextProvider>
    </Router>
  );
};

export default App; 