import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Hero from './components/Hero';
import Collection from './components/Collection';
import CollabCollections from './components/CollabCollections';
import CelebUpgrades from './components/CelebUpgrades';
import Merch from './pages/Merch';
import Roadmap from './pages/Roadmap';
import Bux from './pages/Bux';

function App() {
  return (
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
        </Routes>
      </div>
    </Router>
  );
}

export default App; 