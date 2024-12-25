import { useState, useEffect } from 'react';
import { ShoppingBagIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

const CATEGORIES = {
  all: 'All Products',
  hats: 'Hats & Caps',
  hoodies: 'Hoodies',
  tshirts: 'T-Shirts'
};

// Get the API URL from environment variables, fallback to localhost if not set
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Merch = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      console.log('Fetching products...'); // Debug log
      const response = await fetch('/api/printful/products');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText); // Debug log
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Products data:', data); // Debug log
      setProducts(data || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const categorizeProduct = (product) => {
    const name = product.name.toLowerCase();
    if (name.includes('hat') || name.includes('cap') || name.includes('beanie')) return 'hats';
    if (name.includes('hoodie')) return 'hoodies';
    if (name.includes('t-shirt')) return 'tshirts';
    return 'other';
  };

  const getFilteredProducts = () => {
    if (!products || products.length === 0) return [];
    
    if (activeCategory === 'all') {
      return products;
    }
    return products.filter(product => categorizeProduct(product) === activeCategory);
  };

  if (loading) {
    return (
      <div className="bg-black min-h-screen pt-20 flex items-center justify-center">
        <div className="text-white">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-black min-h-screen pt-20 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  const filteredProducts = getFilteredProducts();

  return (
    <div className="bg-black min-h-screen pt-20">
      {/* Shop Header */}
      <div className="bg-gradient-to-b from-purple-900/50 to-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">BUXDAO Shop</h1>
            <button className="relative p-2">
              <ShoppingBagIcon className="h-6 w-6 text-white" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-8 py-4">
            <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400" />
            {Object.entries(CATEGORIES).map(([key, label]) => (
              <button
                key={key}
                className={`text-sm ${
                  activeCategory === key
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveCategory(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No products found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden group">
                <div className="aspect-w-1 aspect-h-1 relative">
                  <img
                    src={product.thumbnail_url}
                    alt={product.name}
                    className="w-full h-full object-center object-cover group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium text-white">{product.name}</h3>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="text-sm">
                      <span className="text-purple-400">{product.variants}</span>
                      <span className="text-gray-400 ml-1">styles</span>
                    </div>
                    <button
                      onClick={() => setCartCount(prev => prev + 1)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm transition-colors"
                    >
                      View Options
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free Shipping Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-purple-900/90 backdrop-blur-sm py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-white text-sm">
            Free shipping on orders over $100 • Fast worldwide delivery
          </p>
        </div>
      </div>
    </div>
  );
};

export default Merch; 