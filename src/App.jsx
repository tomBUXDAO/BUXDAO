import Header from './components/Header';
import Hero from './components/Hero';
import Collection from './components/Collection';
import BuxInfo from './components/BuxInfo';

function App() {
  return (
    <div className="min-h-screen bg-black overflow-x-hidden relative w-full">
      <Header />
      <Hero />
      <Collection />
      <BuxInfo />
    </div>
  );
}

export default App; 