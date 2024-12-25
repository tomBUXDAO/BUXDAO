import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Collection from './components/Collection';
import BuxInfo from './components/BuxInfo';
import CollabCollections from './components/CollabCollections';
import CelebUpgrades from './components/CelebUpgrades';
import Merch from './pages/Merch';

function HomePage() {
  return (
    <>
      <Hero />
      <Collection />
      <BuxInfo />
      <CollabCollections />
      <CelebUpgrades />
    </>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-black overflow-x-hidden relative w-full">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/merch" element={<Merch />} />
          {/* Add other routes as needed */}
        </Routes>
      </div>
    </Router>
  );
}

export default App; 