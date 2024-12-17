import Header from './components/Header';
import Hero from './components/Hero';
import Collection from './components/Collection';
import BuxInfo from './components/BuxInfo';
import CollabCollections from './components/CollabCollections';

function App() {
  return (
    <div className="min-h-screen bg-black overflow-x-hidden relative w-full">
      <Header />
      <Hero />
      <Collection />
      <BuxInfo />
      <CollabCollections />
    </div>
  );
}

export default App; 