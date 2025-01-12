const fetchProducts = async () => {
  console.log('Fetching products...');
  try {
    const response = await fetch('/api/printful/products');
    const data = await response.json();
    setProducts(data);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}; 