import axios from 'axios';

const PRINTFUL_API_URL = 'https://api.printful.com';
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

async function testPrintfulConnection() {
  try {
    console.log('Testing Printful API connection...');
    
    // Test 1: Get store products
    const productsResponse = await axios.get(`${PRINTFUL_API_URL}/store/products`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Products API working');
    console.log(`Found ${productsResponse.data.result.length} products`);
    
    // Test 2: Test order creation (draft mode)
    const testOrder = {
      recipient: {
        name: "Test User",
        address1: "123 Test St",
        city: "Test City",
        state_code: "CA",
        country_code: "US",
        zip: "90210",
        email: "test@example.com"
      },
      items: [
        {
          variant_id: 4011,
          quantity: 1,
          retail_price: "25.00"
        }
      ],
      shipping: "STANDARD",
      notes: "Test order from BUXDAO"
    };
    
    console.log('Testing order creation...');
    const orderResponse = await axios.post(`${PRINTFUL_API_URL}/orders`, testOrder, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Order creation working');
    console.log(`Created test order: ${orderResponse.data.result.id}`);
    
    // Clean up: Cancel the test order
    await axios.delete(`${PRINTFUL_API_URL}/orders/${orderResponse.data.result.id}`, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Test order cleaned up');
    console.log('\n🎉 All Printful API tests passed!');
    
  } catch (error) {
    console.error('❌ Printful API test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!PRINTFUL_API_KEY) {
    console.error('❌ PRINTFUL_API_KEY environment variable not set');
    process.exit(1);
  }
  
  testPrintfulConnection();
}

export { testPrintfulConnection }; 