import { useState } from 'react';
import { ShoppingBagIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

const products = {
  hats: [
    {
      id: 1,
      name: 'BUXDAO Classic Snapback',
      price: 29.99,
      image: '/merch/hat-1.jpg',
      colors: ['Black', 'Navy', 'Gray'],
      inStock: true
    },
    {
      id: 2,
      name: 'BUXDAO Beanie',
      price: 24.99,
      image: '/merch/hat-2.jpg',
      colors: ['Black', 'Gray'],
      inStock: true
    }
  ],
  hoodies: [
    {
      id: 3,
      name: 'BUXDAO Logo Hoodie',
      price: 59.99,
      image: '/merch/hoodie-1.jpg',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Black', 'Gray', 'Navy'],
      inStock: true
    },
    {
      id: 4,
      name: 'BUXDAO Art Collection Hoodie',
      price: 64.99,
      image: '/merch/hoodie-2.jpg',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Black', 'White'],
      inStock: true
    }
  ],
  tshirts: [
    {
      id: 5,
      name: 'BUXDAO Classic Tee',
      price: 29.99,
      image: '/merch/tshirt-1.jpg',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Black', 'White', 'Gray', 'Navy'],
      inStock: true
    },
    {
      id: 6,
      name: 'BUXDAO NFT Collection Tee',
      price: 34.99,
      image: '/merch/tshirt-2.jpg',
      sizes: ['S', 'M', 'L', 'XL', '2XL'],
      colors: ['Black', 'White'],
      inStock: true
    }
  ]
};

const Merch = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cartCount, setCartCount] = useState(0);

  const getFilteredProducts = () => {
    if (activeCategory === 'all') {
      return [...products.hats, ...products.hoodies, ...products.tshirts];
    }
    return products[activeCategory] || [];
  };

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
            {['all', 'hats', 'hoodies', 'tshirts'].map((category) => (
              <button
                key={category}
                className={`text-sm ${
                  activeCategory === category
                    ? 'text-purple-400 border-b-2 border-purple-400'
                    : 'text-gray-400 hover:text-white'
                } capitalize`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {getFilteredProducts().map((product) => (
            <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="aspect-w-1 aspect-h-1">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-center object-cover hover:opacity-75 transition-opacity"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-white">{product.name}</h3>
                <div className="mt-2 flex justify-between items-center">
                  <p className="text-purple-400">${product.price}</p>
                  <button
                    onClick={() => setCartCount(prev => prev + 1)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm transition-colors"
                  >
                    Add to Cart
                  </button>
                </div>
                {product.sizes && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.sizes.map(size => (
                      <span key={size} className="text-xs text-gray-400 border border-gray-700 rounded px-2 py-1">
                        {size}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
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