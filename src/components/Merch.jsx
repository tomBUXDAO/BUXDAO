import { useState, useEffect } from 'react';

const products = [
  {
    id: 1,
    name: 'BUXDAO T-Shirt',
    price: '£25.00',
    image: '/merch/tshirt.jpg', // We'll need to add these images
    description: 'Premium cotton t-shirt with BUXDAO design',
    sizes: ['S', 'M', 'L', 'XL', '2XL'],
    colors: ['Black', 'White', 'Navy']
  },
  // Add more products here
];

const Merch = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <section className="bg-black py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-6 pb-2">
            BUXDAO Merch
          </h2>
          <p className="text-xl text-gray-200">
            Official BUXDAO merchandise. High-quality products with unique designs.
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {products.map((product) => (
            <div 
              key={product.id}
              className="bg-gray-900 rounded-xl overflow-hidden hover:transform hover:scale-105 transition-transform duration-300"
            >
              <div className="aspect-w-1 aspect-h-1 w-full">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-center object-cover"
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-white mb-2">{product.name}</h3>
                <p className="text-gray-400 mb-4">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xl text-white font-bold">{product.price}</span>
                  <button 
                    onClick={() => window.open('YOUR_PRINTFUL_STORE_URL', '_blank')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-full transition-colors duration-300"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Size Guide */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-white mb-4">Size Guide</h3>
          <p className="text-gray-400 mb-8">
            All measurements are in inches. For detailed size information, check the product page.
          </p>
          <div className="inline-block">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Chest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Length</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {['S', 'M', 'L', 'XL', '2XL'].map((size) => (
                  <tr key={size} className="text-gray-300">
                    <td className="px-6 py-4 whitespace-nowrap">{size}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {size === 'S' && '36-38'}
                      {size === 'M' && '39-41'}
                      {size === 'L' && '42-44'}
                      {size === 'XL' && '45-47'}
                      {size === '2XL' && '48-50'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {size === 'S' && '28'}
                      {size === 'M' && '29'}
                      {size === 'L' && '30'}
                      {size === 'XL' && '31'}
                      {size === '2XL' && '32'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Merch; 