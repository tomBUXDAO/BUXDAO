import { useState, useEffect } from 'react';
import { ShoppingBagIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CATEGORIES = {
  all: 'All Products',
  hats: 'Hats & Caps',
  hoodies: 'Hoodies',
  tshirts: 'T-Shirts'
};

// Get the API URL from environment variables, fallback to localhost if not set
const API_URL = '/api';  // Use Vite proxy path

const hasBackDesign = (productName) => {
  const name = productName.toLowerCase();
  return (
    (name.includes('fcked catz') || 
     name.includes('bitbots') || 
     name.includes('monsters')) &&
    (name.includes('t-shirt') || 
     name.includes('hoodie'))
  );
};

const getProductImages = (product, selectedColor = null) => {
  const productName = product.name.toLowerCase();
  const color = selectedColor?.toLowerCase().replace(/ /g, '-') || 'black';
  
  // Handle products with back designs (BitBots, FCKed Catz, Monsters)
  if (hasBackDesign(productName)) {
    let collection = '';
    let type = '';
    
    if (productName.includes('fcked catz')) {
      collection = 'catz';
    } else if (productName.includes('bitbots')) {
      collection = 'bitbots';
    } else if (productName.includes('monsters')) {
      collection = 'monsters';
    }
    
    type = productName.includes('t-shirt') ? 'tees' : 'hoodies';
    
    return {
      frontImage: `/merch/${collection}/${type}/${color}-front.jpg`,
      backImage: `/merch/${collection}/${type}/${color}-back.jpg`
    };
  }
  
  // Handle BUX products
  if (productName.includes('bux')) {
    if (productName.includes('t-shirt') || productName.includes('tee')) {
      return {
        frontImage: `/merch/bux/tees/${color}.jpg`,
        backImage: null
      };
    } else if (productName.includes('hoodie')) {
      return {
        frontImage: `/merch/bux/hoodies/${color}.jpg`,
        backImage: null
      };
    } else if (productName.includes('dad hat')) {
      return {
        frontImage: `/merch/bux/dad hat/${color}.jpg`,
        backImage: null
      };
    } else if (productName.includes('beanie')) {
      return {
        frontImage: `/merch/bux/beanie/${color}.jpg`,
        backImage: null
      };
    } else if (productName.includes('flat') || productName.includes('bill')) {
      return {
        frontImage: `/merch/bux/flat bill/${color}.jpg`,
        backImage: null
      };
    }
  }
  
  // Fallback to product thumbnail
  return {
    frontImage: product.thumbnail_url,
    backImage: null
  };
};

const ProductModal = ({ product: initialProduct, onClose, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [error, setError] = useState(null);
  const [showingBack, setShowingBack] = useState(false);
  const [product, setProduct] = useState(initialProduct);

  useEffect(() => {
    const fetchVariants = async () => {
      try {
        const response = await fetch(`${API_URL}/printful/products/${product.id}`);
        if (!response.ok) throw new Error('Failed to fetch variants');
        const data = await response.json();
        console.log('Product data from Printful:', data);
        setVariants(data.sync_variants || []);
        // Store the sync_product data
        setProduct(prevProduct => ({
          ...prevProduct,
          description: data.sync_product.description
        }));
        // Set default color and variant
        if (data.sync_variants && data.sync_variants.length > 0) {
          const defaultVariant = data.sync_variants[0];
          setSelectedColor(defaultVariant.color);
          setSelectedVariant(defaultVariant);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchVariants();
  }, [product.id]);

  // Update selected variant when color changes
  useEffect(() => {
    if (selectedColor && variants.length > 0) {
      const newVariant = variants.find(v => v.color === selectedColor);
      if (newVariant) {
        console.log('Selected variant:', newVariant);
        console.log('Variant files:', newVariant.files);
        setSelectedVariant(newVariant);
      }
    }
  }, [selectedColor, variants]);

  const handleAddToCart = () => {
    if (!selectedSize) {
      alert('Please select a size');
      return;
    }
    if (!selectedColor) {
      alert('Please select a color');
      return;
    }
    if (!selectedVariant) {
      alert('Please select a valid option');
      return;
    }
    
    const { frontImage } = getProductImages();
    
    onAddToCart({
      ...product,
      size: selectedSize,
      color: selectedColor,
      quantity,
      price: selectedVariant.retail_price,
      thumbnail_url: frontImage
    });
    onClose();
  };

  // Get unique colors from variants
  const colors = Array.from(new Set(variants.map(v => v.color)));

  const { frontImage, backImage } = getProductImages(product);
  const currentImage = showingBack ? backImage : frontImage;
  const thumbnailImage = showingBack ? frontImage : backImage;
  const showBackOption = hasBackDesign(product.name) && backImage;
  const currentPrice = selectedVariant?.retail_price ? Number(selectedVariant.retail_price) : null;

  const formatColorName = (color) => {
    if (color.toLowerCase() === 'cranberry') {
      return 'Cran-\nberry';
    }
    return color;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">{product.name}</h2>
              <p className="text-xl text-purple-400 mt-1">
                {currentPrice ? `$${currentPrice.toFixed(2)}` : 'Select options for price'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="relative w-full">
              <div className="relative w-full">
                <img
                  src={showingBack ? backImage : frontImage}
                  alt={`${product.name} ${showingBack ? 'back' : 'front'} view in ${selectedColor || ''}`}
                  className="w-full rounded-lg"
                />
                {hasBackDesign(product.name) && backImage && (
                  <div className="absolute inset-0">
                    <button
                      onClick={() => setShowingBack(!showingBack)}
                      className="absolute bottom-4 right-4 w-20 h-20 rounded-lg overflow-hidden border-2 border-purple-500 hover:border-purple-400 transition-colors bg-gray-900"
                    >
                      <img
                        src={showingBack ? frontImage : backImage}
                        alt={`${product.name} ${!showingBack ? 'back' : 'front'} view`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-xs text-white font-medium">
                          {showingBack ? 'Front' : 'Back'}
                        </span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              {product.description && (
                <div className="mt-4 text-gray-400 text-sm">
                  {product.description}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {loading ? (
                <div className="text-gray-400">Loading variants...</div>
              ) : error ? (
                <div className="text-red-500">Error: {error}</div>
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Color</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {colors.map((color) => (
                        <button
                          key={color}
                          className={`min-h-[60px] py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center ${
                            selectedColor === color
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                          onClick={() => setSelectedColor(color)}
                        >
                          <span className="text-center leading-tight whitespace-pre-line">
                            {formatColorName(color)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Size</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from(new Set(variants
                        .filter(v => v.color === selectedColor)
                        .map(v => v.size)))
                        .map((size) => (
                          <button
                            key={size}
                            className={`min-h-[60px] py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center ${
                              selectedSize === size
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                            onClick={() => setSelectedSize(size)}
                          >
                            <span className="text-center leading-tight">
                              {size}
                            </span>
                          </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Quantity</h3>
                    <div className="flex items-center space-x-4">
                      <button
                        className="bg-gray-800 text-white p-2 rounded-md hover:bg-gray-700"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      >
                        -
                      </button>
                      <span className="text-white">{quantity}</span>
                      <button
                        className="bg-gray-800 text-white p-2 rounded-md hover:bg-gray-700"
                        onClick={() => setQuantity(q => q + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-purple-600 text-white py-3 px-6 rounded-full hover:bg-purple-700 transition-colors"
                  >
                    Add to Cart
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CartSidebar = ({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem }) => {
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-gray-900 shadow-xl transform transition-transform duration-300 z-50 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Shopping Cart</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              Your cart is empty
            </div>
          ) : (
            <div className="space-y-6">
              {items.map((item) => (
                <div key={`${item.id}-${item.size}`} className="flex items-start space-x-4">
                  <img
                    src={item.thumbnail_url}
                    alt={item.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="text-white font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-400">Size: {item.size}</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <button
                        className="text-gray-400 hover:text-white"
                        onClick={() => onUpdateQuantity(item, Math.max(1, item.quantity - 1))}
                      >
                        -
                      </button>
                      <span className="text-white">{item.quantity}</span>
                      <button
                        className="text-gray-400 hover:text-white"
                        onClick={() => onUpdateQuantity(item, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button
                        className="ml-4 text-red-500 hover:text-red-400 text-sm"
                        onClick={() => onRemoveItem(item)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-medium">${total.toFixed(2)}</span>
            </div>
            <button className="w-full bg-purple-600 text-white py-3 px-6 rounded-full hover:bg-purple-700 transition-colors">
              Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Merch = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showingBackMap, setShowingBackMap] = useState({});  // New state for tracking front/back toggle

  // Toggle front/back view for a specific product
  const toggleBackView = (productId) => {
    setShowingBackMap(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        console.log('Fetching products...');
        const response = await fetch(`${API_URL}/printful/products`);
        if (!response.ok) {
          const errorData = await response.json();
          console.log('API Error:', JSON.stringify(errorData));
          throw new Error(`Failed to fetch products: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Products data:', data);
        
        // Fetch prices for each product
        const productsWithPrices = await Promise.all(
          data.map(async (product) => {
            try {
              const variantResponse = await fetch(`${API_URL}/printful/products/${product.id}`);
              if (!variantResponse.ok) throw new Error('Failed to fetch variant');
              const variantData = await variantResponse.json();
              return {
                ...product,
                sync_variants: variantData.sync_variants
              };
            } catch (err) {
              console.error(`Error fetching variants for product ${product.id}:`, err);
              return product;
            }
          })
        );
        
        console.log('Products with prices:', productsWithPrices);
        setProducts(productsWithPrices);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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

  const handleAddToCart = (product) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(
        item => item.id === product.id && item.size === product.size
      );

      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id && item.size === product.size
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        );
      }

      return [...prevItems, product];
    });
  };

  const updateCartItemQuantity = (item, newQuantity) => {
    setCartItems(prevItems =>
      prevItems.map(prevItem =>
        prevItem.id === item.id && prevItem.size === item.size
          ? { ...prevItem, quantity: newQuantity }
          : prevItem
      )
    );
  };

  const removeCartItem = (item) => {
    setCartItems(prevItems =>
      prevItems.filter(
        prevItem => !(prevItem.id === item.id && prevItem.size === item.size)
      )
    );
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
      <div className="bg-gradient-to-b from-purple-900/50 to-black py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                BUXDAO Shop
              </h1>
              <p className="text-gray-300 text-lg mt-2">
                All merchandise can be paid for using USDC
              </p>
            </div>
            <button 
              className="relative p-2 sm:hidden block"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBagIcon className="h-6 w-6 text-white" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filter */}
        <div className="border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8 py-4 overflow-x-auto">
              <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
              {Object.entries(CATEGORIES).map(([key, label]) => (
                <button
                  key={key}
                  className={`text-sm whitespace-nowrap ${
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
            <button 
              className="relative p-2 hidden sm:block"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBagIcon className="h-6 w-6 text-white" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 sm:pb-16">
        {filteredProducts.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            No products found in this category.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => {
              const { frontImage, backImage } = getProductImages(product);
              const isShowingBack = showingBackMap[product.id];
              
              return (
                <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden group">
                  <div className="aspect-w-1 aspect-h-1 relative">
                    <img
                      src={isShowingBack ? backImage : frontImage}
                      alt={product.name}
                      className="w-full h-full object-center object-cover group-hover:opacity-75 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {hasBackDesign(product.name) && backImage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBackView(product.id);
                        }}
                        className="absolute bottom-4 right-4 w-16 h-16 rounded-lg overflow-hidden border-2 border-purple-500 hover:border-purple-400 transition-colors bg-gray-900"
                      >
                        <img
                          src={isShowingBack ? frontImage : backImage}
                          alt={`${product.name} ${!isShowingBack ? 'back' : 'front'} view`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-white">{product.name}</h3>
                    <div className="mt-2 flex justify-between items-center">
                      <div className="text-purple-400 text-lg font-medium">
                        {product.sync_variants?.length > 0 ? 
                          `$${Number(product.sync_variants[0].retail_price).toFixed(2)}` : 
                          product.retail_price ? 
                            `$${Number(product.retail_price).toFixed(2)}` : 
                            'Price not available'
                        }
                      </div>
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-sm transition-colors"
                      >
                        View Options
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Free Shipping Banner */}
      <div className="fixed bottom-0 left-0 right-0 bg-purple-900/90 backdrop-blur-sm py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-white text-sm">
            Free shipping on orders over $100<br className="sm:hidden" /> 🚚 Fast worldwide delivery
          </p>
        </div>
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Cart Sidebar */}
      <CartSidebar
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateCartItemQuantity}
        onRemoveItem={removeCartItem}
      />
    </div>
  );
};

export default Merch; 