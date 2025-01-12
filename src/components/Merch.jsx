const fetchProducts = async () => {
  console.log('Fetching products...');
  try {
    const response = await fetch('http://localhost:3002/products');
    const rawResponse = await response.text();
    console.log('Raw response:', rawResponse);
    const data = JSON.parse(rawResponse);
    setProducts(data);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}; 