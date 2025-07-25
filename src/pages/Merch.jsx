import { useState, useEffect } from 'react';
import { ShoppingBagIcon, AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import countryData from '../utils/countryData'; // We'll create this file for country/dial code info
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import ToggleSwitch from '../components/ToggleSwitch';

const CATEGORIES = {
  all: 'All Products',
  hats: 'Hats & Caps',
  hoodies: 'Hoodies',
  tshirts: 'T-Shirts'
};

// Get the API URL from environment variables, fallback to localhost if not set
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://buxdao.com/api'
  : '/api';

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
    // Check if we already have variants from the main product fetch
    if (product.sync_variants && product.sync_variants.length > 0) {
      console.log('Using existing variants for product:', product.id);
      setVariants(product.sync_variants);
      setProduct(prevProduct => ({
        ...prevProduct,
        description: product.description || prevProduct.description
      }));
      // Set default color and variant
      if (product.sync_variants.length > 0) {
        const defaultVariant = product.sync_variants[0];
        setSelectedColor(defaultVariant.color);
        setSelectedVariant(defaultVariant);
      }
      setLoading(false);
      return;
    }

    // Only fetch if we don't have variants
    const fetchVariants = async () => {
      try {
        const response = await fetch(`${API_URL}/printful/products/${product.id}`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error('Failed to fetch variants');
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Invalid content type:', contentType);
          throw new Error('Invalid response format: expected JSON');
        }

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
        console.error('Error fetching variants:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    fetchVariants();
  }, [product.id, product.sync_variants]);

  // Update selected variant and preselect size if only one size for color
  useEffect(() => {
    if (selectedColor && variants.length > 0) {
      const colorVariants = variants.filter(v => v.color === selectedColor);
      if (colorVariants.length === 1) {
        setSelectedSize(colorVariants[0].size);
      } else {
        setSelectedSize('');
      }
      const newVariant = colorVariants[0];
      if (newVariant) {
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
    
    // Find the specific variant that matches both color and size
    const specificVariant = variants.find(v => 
      v.color === selectedColor && v.size === selectedSize
    );
    
    if (!specificVariant) {
      alert('Selected combination not available');
      return;
    }
    
    const { frontImage } = getProductImages(product, selectedColor);
    
    onAddToCart({
      ...product,
      size: selectedSize,
      color: selectedColor,
      quantity,
      price: specificVariant.retail_price,
      thumbnail_url: frontImage,
      sync_variant_id: specificVariant.id, // This is required for Printful orders
      variant_id: specificVariant.variant_id // Backup variant ID
    });
    onClose();
  };

  // Get unique colors from variants
  const colors = Array.from(new Set(variants.map(v => v.color)));

  const { frontImage, backImage } = getProductImages(product, selectedColor);
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

const CartSidebar = ({ isOpen, onClose, items, onUpdateQuantity, onRemoveItem, onCheckout, shippingForm, setShippingForm, shippingFormIsValid, setShippingFormIsValid, activeTab, setActiveTab }) => {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Fetch orders when switching to My Orders tab
  useEffect(() => {
    const fetchOrders = async () => {
      if (activeTab === 'orders' && publicKey) {
        setOrdersLoading(true);
        setOrdersError(null);
        try {
          const res = await fetch(`/api/printful/order/${publicKey.toString()}`);
          if (!res.ok) throw new Error('Failed to fetch orders');
          const data = await res.json();
          setOrders(data.orders || []);
        } catch (err) {
          setOrdersError(err.message);
        } finally {
          setOrdersLoading(false);
        }
      }
    };
    fetchOrders();
  }, [activeTab, publicKey]);

  return (
    <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-gray-900 shadow-xl transform transition-transform duration-300 z-50 ${
      isOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="h-full flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <ToggleSwitch
              isOn={activeTab === 'orders'}
              onToggle={() => setActiveTab(activeTab === 'cart' ? 'orders' : 'cart')}
              leftLabel="Cart"
              rightLabel="My Orders"
              disabled={!publicKey && activeTab === 'orders'}
              disabledTooltip="Connect wallet to view orders"
              setActiveTab={setActiveTab}
              activeTab={activeTab}
            />
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {activeTab === 'cart' ? (
            items.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                Your cart is empty
              </div>
            ) : (
              <>
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
                {/* Shipping Form below cart items */}
                <ShippingForm
                  form={shippingForm}
                  setForm={setShippingForm}
                  isValid={shippingFormIsValid}
                  setIsValid={setShippingFormIsValid}
                />
              </>
            )
          ) : (
            <div>
              {!publicKey ? (
                <div className="text-center text-gray-400 py-12">Connect your wallet to view orders.</div>
              ) : ordersLoading ? (
                <div className="text-center text-gray-400 py-12">Loading orders...</div>
              ) : ordersError ? (
                <div className="text-center text-red-500 py-12">{ordersError}</div>
              ) : orders.length === 0 ? (
                <div className="text-center text-gray-400 py-12">No orders found.</div>
              ) : (
                <div className="space-y-6">
                  {orders.map(order => (
                    <div key={order.id} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-white font-semibold">Order #{order.id}</span>
                        <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">
                        Status: <span className="font-medium">{order.status}</span>
                      </div>
                      <div className="text-xs text-gray-400 mb-2">
                        {order.cart && Array.isArray(order.cart) && order.cart.map((item, idx) => (
                          <div key={idx}>
                            {item.name} ({item.size}) x{item.quantity} - ${item.price}
                          </div>
                        ))}
                      </div>
                      <a
                        href={`https://solscan.io/tx/${order.tx_signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:underline"
                      >
                        View Transaction
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Only show checkout if Cart tab is active and there are items */}
        {activeTab === 'cart' && items.length > 0 && (
          <div className="p-6 border-t border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white font-medium">${total.toFixed(2)}</span>
            </div>
            <button 
              onClick={() => onCheckout(items, total, shippingForm)}
              className={`w-full bg-purple-600 text-white py-3 px-6 rounded-full hover:bg-purple-700 transition-colors ${!shippingFormIsValid ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!shippingFormIsValid}
            >
              Checkout with SOL
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PROJECT_WALLET = new PublicKey('FYfLzXckAf2JZoMYBz2W4fpF9vejqpA6UFV17d1A7C75');



// Helper function to check transaction status
async function checkTransactionStatus(connection, signature) {
  try {
    const status = await connection.getSignatureStatus(signature);
    return status.value;
  } catch (error) {
    console.error('Error checking transaction status:', error);
    return null;
  }
}

// Helper: Capitalise first letter of each word
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

const US_STATES = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
  { name: 'District of Columbia', code: 'DC' },
  { name: 'American Samoa', code: 'AS' },
  { name: 'Guam', code: 'GU' },
  { name: 'Northern Mariana Islands', code: 'MP' },
  { name: 'Puerto Rico', code: 'PR' },
  { name: 'United States Minor Outlying Islands', code: 'UM' },
  { name: 'U.S. Virgin Islands', code: 'VI' },
  { name: 'Virgin Islands', code: 'VI' }
];

const ShippingForm = ({ form, setForm, isValid, setIsValid }) => {
  const [saveDetails, setSaveDetails] = useState(false);

  // Autofill from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('buxdao_shipping');
    if (saved) {
      setForm(JSON.parse(saved));
      setSaveDetails(true);
    }
  }, [setForm]);

  // Validate form fields
  useEffect(() => {
    const requiredFields = [
      'firstName', 'lastName', 'email', 'country', 'dialCode',
      'address1', 'city', 'state', 'postalCode'
    ];
    const allFilled = requiredFields.every(f => form[f] && form[f].trim() !== '');
    const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email);
    const countryObj = countryData.find(c => c.name === form.country);
    const dialCodeMatches = countryObj && countryObj.dial_code === form.dialCode;
    setIsValid(allFilled && emailValid && dialCodeMatches);
  }, [form, setIsValid]);

  // Save details to localStorage on submit (parent should call this after successful checkout)
  const handleSaveDetails = () => {
    if (saveDetails) {
      localStorage.setItem('buxdao_shipping', JSON.stringify(form));
    } else {
      localStorage.removeItem('buxdao_shipping');
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 mb-8 max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-4">Shipping & Contact Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="First Name*"
          value={form.firstName}
          onChange={e => setForm(f => ({ ...f, firstName: toTitleCase(e.target.value) }))}
        />
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="Last Name*"
          value={form.lastName}
          onChange={e => setForm(f => ({ ...f, lastName: toTitleCase(e.target.value) }))}
        />
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="Email Address*"
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        />
        {/* Removed dial code dropdown, only country selector and phone input remain */}
        <div className="col-span-2 flex flex-col sm:flex-row gap-2 min-w-0 overflow-hidden">
          <select
            className="bg-gray-800 text-white rounded px-4 py-2 flex-1 w-full"
            value={form.country}
            onChange={e => {
              const country = e.target.value;
              const countryObj = countryData.find(c => c.name === country);
              setForm(f => ({ ...f, country, dialCode: countryObj ? countryObj.dial_code : '' }));
            }}
          >
            <option value="">Country*</option>
            {countryData.map(c => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        {/* Phone Number with flag and dial code prefix */}
        <div className="col-span-2 flex items-center bg-gray-800 rounded px-4 py-2">
          {/* Country flag and dial code prefix */}
          {form.country && countryData.find(c => c.name === form.country) ? (
            <span className="flex items-center mr-2 select-none">
              <span className="text-lg mr-1">{countryData.find(c => c.name === form.country).flag}</span>
              <span className="text-white font-medium">{countryData.find(c => c.name === form.country).dial_code}</span>
            </span>
          ) : null}
          <input
            className="bg-transparent text-white flex-1 outline-none border-none"
            placeholder="Phone Number (optional)"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            style={{ minWidth: 0 }}
            type="tel"
          />
        </div>
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="Address Line 1*"
          value={form.address1}
          onChange={e => setForm(f => ({ ...f, address1: toTitleCase(e.target.value) }))}
        />
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="Address Line 2 (optional)"
          value={form.address2}
          onChange={e => setForm(f => ({ ...f, address2: toTitleCase(e.target.value) }))}
        />
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="City*"
          value={form.city}
          onChange={e => setForm(f => ({ ...f, city: toTitleCase(e.target.value) }))}
        />
        {/* US state dropdown if country is United States, else text input */}
        {form.country === 'United States' ? (
          <select
            className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
            value={form.state}
            onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
          >
            <option value="">State*</option>
            {US_STATES.map(s => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        ) : (
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="State/Province/Region*"
          value={form.state}
          onChange={e => setForm(f => ({ ...f, state: toTitleCase(e.target.value) }))}
        />
        )}
        <input
          className="bg-gray-800 text-white rounded px-4 py-2 col-span-2"
          placeholder="Postal/ZIP Code*"
          value={form.postalCode}
          onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
        />
      </div>
      <div className="flex items-center mt-4">
        <input
          type="checkbox"
          id="saveDetails"
          checked={saveDetails}
          onChange={e => setSaveDetails(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="saveDetails" className="text-white">Save my details for next time</label>
      </div>
    </div>
  );
};

const Merch = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showingBackMap, setShowingBackMap] = useState({});  // New state for tracking front/back toggle
  const [thankYou, setThankYou] = useState(false);
  const [cartSidebarTab, setCartSidebarTab] = useState('cart');
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  const [productsLoaded, setProductsLoaded] = useState(false); // Flag to prevent duplicate loading
  const [shippingForm, setShippingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
    dialCode: '',
    phone: '',
    address1: '',
    city: '',
    state: '',
    postalCode: ''
  });
  const [shippingFormIsValid, setShippingFormIsValid] = useState(false);
  // New state for transaction summary modal
  const [showTxSummary, setShowTxSummary] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null); // {items, total, shippingInfo}
  const [transactionStatus, setTransactionStatus] = useState(null); // 'pending', 'confirmed', 'failed'
  const [lastTransactionSignature, setLastTransactionSignature] = useState(null);
  // --- Add state for Printful order ID and status ---
  const [pendingPrintfulOrderId, setPendingPrintfulOrderId] = useState(null);
  const [pendingPrintfulOrder, setPendingPrintfulOrder] = useState(null);
  const [printfulOrderError, setPrintfulOrderError] = useState(null);

  // Toggle front/back view for a specific product
  const toggleBackView = (productId) => {
    setShowingBackMap(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  useEffect(() => {
    // Prevent duplicate loading
    if (productsLoaded) {
      return;
    }
    
    let isMounted = true;
    const fetchProducts = async () => {
      try {
        console.log('Fetching products...');
        const response = await fetch(`${API_URL}/printful/products`);
        
        if (!response.ok) {
          const errorData = await response.text();
          console.error('API Error:', errorData);
          try {
            const jsonError = JSON.parse(errorData);
            throw new Error(jsonError.message || `Failed to fetch products: ${response.statusText}`);
          } catch (e) {
            throw new Error(`Failed to fetch products: ${response.statusText}`);
          }
        }

        let data;
        try {
          const text = await response.text();
          console.log('Raw response:', text);
          data = JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse response:', e);
          throw new Error('Invalid response format');
        }

        console.log('Products data:', data);
        
        // Fetch variants with caching and rate limiting
        const productsWithPrices = [];
        const variantCache = new Map();
        const totalProducts = data.length;
        
        for (let i = 0; i < data.length; i++) {
          const product = data[i];
          const progress = Math.round(((i + 1) / totalProducts) * 100);
          setLoadingProgress(progress);
          try {
            // Check cache first
            if (variantCache.has(product.id)) {
              const cachedVariants = variantCache.get(product.id);
              productsWithPrices.push({
                ...product,
                sync_variants: cachedVariants
              });
              continue;
            }
            
            // Add a small delay between requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const variantResponse = await fetch(`${API_URL}/printful/products/${product.id}`);
            if (!variantResponse.ok) {
              console.warn(`Skipping variants for product ${product.id} due to API error:`, await variantResponse.text());
              const emptyVariants = [];
              variantCache.set(product.id, emptyVariants);
              productsWithPrices.push({
                ...product,
                sync_variants: emptyVariants
              });
              continue;
            }

            let variantData;
            try {
              const text = await variantResponse.text();
              console.log(`Raw variant response for ${product.id}:`, text);
              variantData = JSON.parse(text);
            } catch (e) {
              console.warn(`Failed to parse variant response for ${product.id}:`, e);
              const emptyVariants = [];
              variantCache.set(product.id, emptyVariants);
              productsWithPrices.push({
                ...product,
                sync_variants: emptyVariants
              });
              continue;
            }

            const variants = variantData.sync_variants || [];
            variantCache.set(product.id, variants);
            
            productsWithPrices.push({
              ...product,
              sync_variants: variants
            });
          } catch (err) {
            console.warn(`Skipping variants for product ${product.id}:`, err);
            const emptyVariants = [];
            variantCache.set(product.id, emptyVariants);
            productsWithPrices.push({
              ...product,
              sync_variants: emptyVariants
            });
          }
        }
        
        console.log('Products with prices:', productsWithPrices);
        if (isMounted) {
          setProducts(productsWithPrices);
          setLoading(false);
          setProductsLoaded(true); // Mark as loaded to prevent duplicates
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        if (isMounted) {
          setError(err.message);
          setLoading(false);
          setProductsLoaded(true); // Mark as loaded even on error to prevent retries
        }
      }
    };

    fetchProducts();
    
    return () => {
      isMounted = false;
    };
  }, [productsLoaded]);

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

  // Modified checkout handler to show summary first
  const handleCheckout = async (items, total, shippingInfo) => {
    try {
      // Place Printful order first (no payment yet)
      const printfulOrderResponse = await fetch('/api/printful/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingInfo,
          cart: items,
          email: shippingInfo.email,
          wallet_address: publicKey ? publicKey.toString() : '',
          skipPayment: true // new flag for backend to skip payment check
        })
      });
      if (!printfulOrderResponse.ok) {
        const errorData = await printfulOrderResponse.json();
        setPrintfulOrderError(errorData.error || 'Failed to place Printful order');
        alert('Printful order failed: ' + (errorData.error || 'Unknown error'));
        return;
      }
      const printfulOrderData = await printfulOrderResponse.json();
      setPendingPrintfulOrderId(printfulOrderData.printful_order_id);
      setPendingPrintfulOrder(printfulOrderData);
      setPrintfulOrderError(null);
      // Fetch SOL price for the summary
      const solPriceResponse = await fetch('/api/sol-price');
      if (!solPriceResponse.ok) {
        throw new Error('Failed to fetch SOL price');
      }
      const { solPrice } = await solPriceResponse.json();
      if (!solPrice || isNaN(solPrice)) {
        throw new Error('Invalid SOL price received');
      }
      const solAmount = total / solPrice;
      setPendingCheckout({ items, total, shippingInfo, solAmount, solPrice });
      setShowTxSummary(true);
    } catch (error) {
      console.error('Error in checkout:', error);
      setPrintfulOrderError(error.message);
      alert('Checkout failed: ' + error.message);
    }
  };

  // --- Update handleConfirmPayment to finalize order after payment ---
  const handleConfirmPayment = async () => {
    setShowTxSummary(false);
    setTransactionStatus('pending');
    if (!publicKey || !connected) {
      alert('Please connect your wallet first.');
      setTransactionStatus(null);
      return;
    }
    const { items, total, shippingInfo } = pendingCheckout;
    try {
      const { solAmount } = pendingCheckout;
      if (!solAmount || isNaN(solAmount)) {
        throw new Error('Invalid SOL amount');
      }
      // Convert to lamports (SOL has 9 decimals)
      const solAmountLamports = Math.round(solAmount * 1e9);
      // Create SOL transfer instruction
      const transferIx = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: PROJECT_WALLET,
        lamports: solAmountLamports
      });
      // Create transaction with SOL transfer
      const transaction = new Transaction();
      transaction.add(transferIx);
      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      setLastTransactionSignature(signature);
      // Wait for confirmation with timeout and retry logic (same as before)
      let confirmationResult = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          // Use a longer timeout for each attempt
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Transaction confirmation timeout')), 30000)
          );
          
          const confirmationPromise = connection.confirmTransaction(signature, 'confirmed');
          
          confirmationResult = await Promise.race([confirmationPromise, timeoutPromise]);
          
          if (confirmationResult.value?.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(confirmationResult.value.err)}`);
          }
          
          console.log('Transaction confirmed successfully:', confirmationResult);
          break;
          
        } catch (confirmError) {
          attempts++;
          console.log(`Confirmation attempt ${attempts} failed:`, confirmError.message);
          
          if (attempts >= maxAttempts) {
            // Check transaction status as a fallback
            console.log('Checking transaction status as fallback...');
            const txStatus = await checkTransactionStatus(connection, signature);
            
            if (txStatus && txStatus.confirmationStatus === 'confirmed' && !txStatus.err) {
              console.log('Transaction was successful despite confirmation timeout');
              confirmationResult = { value: txStatus };
              break;
            } else if (txStatus && txStatus.err) {
              throw new Error(`Transaction failed: ${JSON.stringify(txStatus.err)}`);
            } else {
              setTransactionStatus('pending');
              setLastTransactionSignature(signature);
              alert(`Transaction confirmation is taking longer than expected. You can check the status on Solscan: https://solscan.io/tx/${signature}`);
              throw new Error(`Transaction confirmation failed after ${maxAttempts} attempts. Please check your wallet and Solscan for the transaction status.`);
            }
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // After confirmation, call backend to finalize/mark order as paid
      const finalizeResponse = await fetch('/api/printful/order/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printful_order_id: pendingPrintfulOrderId,
          txSignature: signature,
          wallet_address: publicKey.toString(),
          cart: items,
          shippingInfo
        })
      });
      if (!finalizeResponse.ok) {
        const errorData = await finalizeResponse.json();
        setTransactionStatus('failed');
        alert('Order finalization failed: ' + (errorData.error || 'Unknown error'));
        return;
      }
      const finalizeData = await finalizeResponse.json();
      setTransactionStatus('confirmed');
      setThankYou(true);
    } catch (orderError) {
      console.error('Failed to finalize order:', orderError);
      setTransactionStatus('failed');
      alert('Failed to finalize order: ' + orderError.message);
    }
  };

  if (thankYou) {
    return (
      <div className="bg-black min-h-screen flex items-center justify-center">
        <div className="bg-gray-900 rounded-lg p-8 text-center relative max-w-md w-full">
          {/* Close (X) button */}
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
            onClick={() => setThankYou(false)}
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-white mb-4">Thank you for your order!</h2>
          <p className="text-gray-300 mb-6">We have received your payment and will process your order soon.</p>
          <button
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-full hover:bg-purple-700 transition-colors mb-2"
            onClick={() => {
              setThankYou(false);
              setIsCartOpen(true);
              setCartSidebarTab('orders');
            }}
          >
            View details in My Orders
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-black min-h-screen pt-20 flex flex-col items-center justify-center">
        {/* Spinning loading icon */}
        <svg className="animate-spin h-10 w-10 text-purple-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
        </svg>
        <div className="text-white text-2xl font-semibold text-center">Loading products...</div>
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
                All merchandise can be purchased using SOL, prices are inclusive of posting and packaging.
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
                <div key={product.id} className="bg-gray-900 rounded-lg overflow-hidden group transition-transform duration-200 hover:scale-105 border-2 border-transparent hover:border-yellow-400" style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)' }}>
                  <div className="aspect-w-1 aspect-h-1 relative">
                    <img
                      src={isShowingBack ? backImage : frontImage}
                      alt={product.name}
                      className="w-full h-full object-center object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    {/* Removed dark overlay */}
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
                  <div className="p-4 transition-transform duration-200 group-hover:scale-105">
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

      {/* Removed Free Shipping Banner */}

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
        onCheckout={handleCheckout}
        shippingForm={shippingForm}
        setShippingForm={setShippingForm}
        shippingFormIsValid={shippingFormIsValid}
        setShippingFormIsValid={setShippingFormIsValid}
        activeTab={cartSidebarTab}
        setActiveTab={setCartSidebarTab}
      />

      {/* Transaction summary modal */}
      {showTxSummary && pendingCheckout && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full text-center relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
              onClick={() => setShowTxSummary(false)}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-4">Confirm Payment</h2>
            <div className="text-gray-300 mb-2">You are about to pay:</div>
            <div className="text-3xl font-bold text-purple-400 mb-4">{pendingCheckout.solAmount.toFixed(4)} SOL</div>
            <div className="text-gray-400 text-sm mb-2">≈ ${pendingCheckout.total.toFixed(2)} USD</div>
            <div className="text-gray-400 mb-2">To:</div>
            <div className="text-xs text-white mb-4 break-all">{PROJECT_WALLET.toString()}</div>
            <button
              className="w-full bg-purple-600 text-white py-3 px-6 rounded-full hover:bg-purple-700 transition-colors mb-2"
              onClick={handleConfirmPayment}
            >
              Confirm and Pay
            </button>
            <button
              className="w-full bg-gray-700 text-white py-2 px-6 rounded-full hover:bg-gray-600 transition-colors"
              onClick={() => setShowTxSummary(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transaction status modal */}
      {transactionStatus && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full text-center relative">
            <div className="mb-4">
              {transactionStatus === 'pending' && (
                <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              )}
              {transactionStatus === 'confirmed' && (
                <div className="w-8 h-8 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {transactionStatus === 'failed' && (
                <div className="w-8 h-8 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {transactionStatus === 'pending' && 'Processing Transaction...'}
              {transactionStatus === 'confirmed' && 'Transaction Confirmed!'}
              {transactionStatus === 'failed' && 'Transaction Failed'}
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              {transactionStatus === 'pending' && 'Please wait while we confirm your payment. This may take up to 30 seconds.'}
              {transactionStatus === 'confirmed' && 'Your payment has been confirmed and your order is being processed.'}
              {transactionStatus === 'failed' && 'There was an issue with your transaction. Please try again.'}
            </p>
            
            {/* Transaction signature display */}
            {lastTransactionSignature && (
              <div className="mb-4 p-3 bg-gray-800 rounded text-xs">
                <div className="text-gray-400 mb-1">Transaction ID:</div>
                <div className="text-white break-all font-mono">{lastTransactionSignature}</div>
                {transactionStatus === 'confirmed' && (
                  <a
                    href={`https://solscan.io/tx/${lastTransactionSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-xs mt-2 inline-block"
                  >
                    View on Solscan →
                  </a>
                )}
              </div>
            )}
            
            {transactionStatus === 'confirmed' && (
              <button
                className="w-full bg-purple-600 text-white py-3 px-6 rounded-full hover:bg-purple-700 transition-colors"
                onClick={() => {
                  setTransactionStatus(null);
                  setLastTransactionSignature(null);
                  setThankYou(true);
                }}
              >
                Continue
              </button>
            )}
            {transactionStatus === 'failed' && (
              <button
                className="w-full bg-gray-700 text-white py-3 px-6 rounded-full hover:bg-gray-600 transition-colors"
                onClick={() => {
                  setTransactionStatus(null);
                  setLastTransactionSignature(null);
                }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Merch; 