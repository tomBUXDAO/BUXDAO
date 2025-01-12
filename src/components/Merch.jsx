const fetchProducts = async () => {
  console.log('Fetching products...');
  try {
    const response = await fetch('/api/printful/products');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Expected array of products');
    }
    setProducts(data);
  } catch (error) {
    console.error('Error fetching products:', error);
    setError('Failed to load products. Please try again later.');
  }
}; 