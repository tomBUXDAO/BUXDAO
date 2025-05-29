import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { WalletContextProvider } from './contexts/WalletContext';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
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
import Spades from './pages/Spades';
import HolderVerification from './components/HolderVerification';
import { UserProvider } from './contexts/UserContext';
import PageTransition from './components/PageTransition';
import ScrollToTop from './components/ScrollToTop';

// Import your styles
import './index.css';

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <PageTransition>
            <Hero />
            <Collection />
            <CollabCollections />
            <CelebUpgrades />
          </PageTransition>
        } />
        <Route path="/merch" element={
          <PageTransition>
            <Merch />
          </PageTransition>
        } />
        <Route path="/roadmap" element={
          <PageTransition>
            <Roadmap />
          </PageTransition>
        } />
        <Route path="/bux" element={
          <PageTransition>
            <Bux />
          </PageTransition>
        } />
        <Route path="/spades" element={
          <PageTransition>
            <Spades />
          </PageTransition>
        } />
        <Route path="/verify" element={
          <PageTransition>
            <HolderVerification />
          </PageTransition>
        } />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  return (
    <Router>
      <WalletContextProvider>
        <UserProvider>
          <div className="min-h-screen bg-black text-white">
            <Toaster position="top-right" />
            <Header />
            <ScrollToTop />
            <AnimatedRoutes />
          </div>
        </UserProvider>
      </WalletContextProvider>
    </Router>
  );
};

export default App; 