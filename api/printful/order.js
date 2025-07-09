import express from 'express';
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { pool } from '../config/database.js';

const router = express.Router();

// Printful API configuration
const PRINTFUL_API_URL = 'https://api.printful.com';
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;

// USDC mint address (mainnet)
const USDC_MINT = 'Es9vMFrzaCERZ6t7Wc8gY6YkF6mF1bQ5Qd8F6F8Q8F8Q';
// Project wallet address
const PROJECT_WALLET = process.env.PROJECT_WALLET;

// Solana RPC endpoint
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC);

// Helper function to map country names to ISO codes
function getCountryCode(countryName) {
  const countryMap = {
    'United States': 'US',
    'United States of America': 'US',
    'USA': 'US',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    'UK': 'GB',
    'Great Britain': 'GB',
    'England': 'GB',
    'Scotland': 'GB',
    'Wales': 'GB',
    'Northern Ireland': 'GB',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Italy': 'IT',
    'Spain': 'ES',
    'Netherlands': 'NL',
    'Belgium': 'BE',
    'Switzerland': 'CH',
    'Austria': 'AT',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Poland': 'PL',
    'Czech Republic': 'CZ',
    'Hungary': 'HU',
    'Romania': 'RO',
    'Bulgaria': 'BG',
    'Greece': 'GR',
    'Portugal': 'PT',
    'Ireland': 'IE',
    'New Zealand': 'NZ',
    'Japan': 'JP',
    'South Korea': 'KR',
    'China': 'CN',
    'India': 'IN',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Peru': 'PE',
    'Venezuela': 'VE',
    'South Africa': 'ZA',
    'Egypt': 'EG',
    'Morocco': 'MA',
    'Tunisia': 'TN',
    'Algeria': 'DZ',
    'Libya': 'LY',
    'Sudan': 'SD',
    'Ethiopia': 'ET',
    'Kenya': 'KE',
    'Nigeria': 'NG',
    'Ghana': 'GH',
    'Senegal': 'SN',
    'Ivory Coast': 'CI',
    'Cameroon': 'CM',
    'Gabon': 'GA',
    'Congo': 'CG',
    'Democratic Republic of the Congo': 'CD',
    'Angola': 'AO',
    'Zambia': 'ZM',
    'Zimbabwe': 'ZW',
    'Botswana': 'BW',
    'Namibia': 'NA',
    'Mozambique': 'MZ',
    'Madagascar': 'MG',
    'Mauritius': 'MU',
    'Seychelles': 'SC',
    'Comoros': 'KM',
    'Mayotte': 'YT',
    'Reunion': 'RE',
    'Saint Helena': 'SH',
    'Ascension': 'AC',
    'Tristan da Cunha': 'TA',
    'Falkland Islands': 'FK',
    'South Georgia': 'GS',
    'South Sandwich Islands': 'GS',
    'Antarctica': 'AQ',
    'Greenland': 'GL',
    'Iceland': 'IS',
    'Faroe Islands': 'FO',
    'Svalbard': 'SJ',
    'Jan Mayen': 'SJ',
    'Bouvet Island': 'BV',
    'Heard Island': 'HM',
    'McDonald Islands': 'HM',
    'French Southern Territories': 'TF',
    'British Indian Ocean Territory': 'IO',
    'Christmas Island': 'CX',
    'Cocos Islands': 'CC',
    'Norfolk Island': 'NF',
    'Pitcairn': 'PN',
    'Tokelau': 'TK',
    'Niue': 'NU',
    'Cook Islands': 'CK',
    'Wallis and Futuna': 'WF',
    'French Polynesia': 'PF',
    'New Caledonia': 'NC',
    'Vanuatu': 'VU',
    'Solomon Islands': 'SB',
    'Papua New Guinea': 'PG',
    'Fiji': 'FJ',
    'Tonga': 'TO',
    'Samoa': 'WS',
    'American Samoa': 'AS',
    'Guam': 'GU',
    'Northern Mariana Islands': 'MP',
    'Micronesia': 'FM',
    'Marshall Islands': 'MH',
    'Palau': 'PW',
    'Nauru': 'NR',
    'Kiribati': 'KI',
    'Tuvalu': 'TV',
    'East Timor': 'TL',
    'Timor-Leste': 'TL',
    'Brunei': 'BN',
    'Malaysia': 'MY',
    'Singapore': 'SG',
    'Thailand': 'TH',
    'Cambodia': 'KH',
    'Laos': 'LA',
    'Vietnam': 'VN',
    'Myanmar': 'MM',
    'Bangladesh': 'BD',
    'Sri Lanka': 'LK',
    'Maldives': 'MV',
    'Pakistan': 'PK',
    'Afghanistan': 'AF',
    'Iran': 'IR',
    'Iraq': 'IQ',
    'Kuwait': 'KW',
    'Saudi Arabia': 'SA',
    'Bahrain': 'BH',
    'Qatar': 'QA',
    'United Arab Emirates': 'AE',
    'Oman': 'OM',
    'Yemen': 'YE',
    'Jordan': 'JO',
    'Syria': 'SY',
    'Lebanon': 'LB',
    'Israel': 'IL',
    'Palestine': 'PS',
    'Cyprus': 'CY',
    'Turkey': 'TR',
    'Georgia': 'GE',
    'Armenia': 'AM',
    'Azerbaijan': 'AZ',
    'Russia': 'RU',
    'Ukraine': 'UA',
    'Belarus': 'BY',
    'Lithuania': 'LT',
    'Latvia': 'LV',
    'Estonia': 'EE',
    'Moldova': 'MD',
    'Slovakia': 'SK',
    'Slovenia': 'SI',
    'Croatia': 'HR',
    'Bosnia and Herzegovina': 'BA',
    'Serbia': 'RS',
    'Montenegro': 'ME',
    'Kosovo': 'XK',
    'Macedonia': 'MK',
    'Albania': 'AL',
    'Kazakhstan': 'KZ',
    'Uzbekistan': 'UZ',
    'Turkmenistan': 'TM',
    'Kyrgyzstan': 'KG',
    'Tajikistan': 'TJ',
    'Mongolia': 'MN',
    'North Korea': 'KP',
    'Taiwan': 'TW',
    'Hong Kong': 'HK',
    'Macau': 'MO',
    'Philippines': 'PH',
    'Indonesia': 'ID'
  };
  
  return countryMap[countryName] || countryName;
}

// Helper function to map US state names to 2-letter codes
function getStateCode(stateName) {
  // Normalize the input: trim whitespace and convert to lowercase
  const normalizedState = stateName.trim().toLowerCase();
  
  const stateMap = {
    // Full names
    'alabama': 'AL',
    'alaska': 'AK',
    'arizona': 'AZ',
    'arkansas': 'AR',
    'california': 'CA',
    'colorado': 'CO',
    'connecticut': 'CT',
    'delaware': 'DE',
    'florida': 'FL',
    'georgia': 'GA',
    'hawaii': 'HI',
    'idaho': 'ID',
    'illinois': 'IL',
    'indiana': 'IN',
    'iowa': 'IA',
    'kansas': 'KS',
    'kentucky': 'KY',
    'louisiana': 'LA',
    'maine': 'ME',
    'maryland': 'MD',
    'massachusetts': 'MA',
    'michigan': 'MI',
    'minnesota': 'MN',
    'mississippi': 'MS',
    'missouri': 'MO',
    'montana': 'MT',
    'nebraska': 'NE',
    'nevada': 'NV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'north carolina': 'NC',
    'north dakota': 'ND',
    'ohio': 'OH',
    'oklahoma': 'OK',
    'oregon': 'OR',
    'pennsylvania': 'PA',
    'rhode island': 'RI',
    'south carolina': 'SC',
    'south dakota': 'SD',
    'tennessee': 'TN',
    'texas': 'TX',
    'utah': 'UT',
    'vermont': 'VT',
    'virginia': 'VA',
    'washington': 'WA',
    'west virginia': 'WV',
    'wisconsin': 'WI',
    'wyoming': 'WY',
    'district of columbia': 'DC',
    'american samoa': 'AS',
    'guam': 'GU',
    'northern mariana islands': 'MP',
    'puerto rico': 'PR',
    'united states minor outlying islands': 'UM',
    'u.s. virgin islands': 'VI',
    'virgin islands': 'VI',
    
    // Common abbreviations and variations
    'nd': 'ND',
    'sd': 'SD',
    'nc': 'NC',
    'sc': 'SC',
    'va': 'VA',
    'wa': 'WA',
    'wv': 'WV',
    'wi': 'WI',
    'wy': 'WY',
    'al': 'AL',
    'ak': 'AK',
    'az': 'AZ',
    'ar': 'AR',
    'ca': 'CA',
    'co': 'CO',
    'ct': 'CT',
    'de': 'DE',
    'fl': 'FL',
    'ga': 'GA',
    'hi': 'HI',
    'id': 'ID',
    'il': 'IL',
    'in': 'IN',
    'ia': 'IA',
    'ks': 'KS',
    'ky': 'KY',
    'la': 'LA',
    'me': 'ME',
    'md': 'MD',
    'ma': 'MA',
    'mi': 'MI',
    'mn': 'MN',
    'ms': 'MS',
    'mo': 'MO',
    'mt': 'MT',
    'ne': 'NE',
    'nv': 'NV',
    'nh': 'NH',
    'nj': 'NJ',
    'nm': 'NM',
    'ny': 'NY',
    'oh': 'OH',
    'ok': 'OK',
    'or': 'OR',
    'pa': 'PA',
    'ri': 'RI',
    'tn': 'TN',
    'tx': 'TX',
    'ut': 'UT',
    'vt': 'VT',
    'dc': 'DC',
    'as': 'AS',
    'gu': 'GU',
    'mp': 'MP',
    'pr': 'PR',
    'um': 'UM',
    'vi': 'VI',
    
    // Common misspellings and variations
    'north dakota': 'ND',
    'south dakota': 'SD',
    'north carolina': 'NC',
    'south carolina': 'SC',
    'west virginia': 'WV',
    'new hampshire': 'NH',
    'new jersey': 'NJ',
    'new mexico': 'NM',
    'new york': 'NY',
    'rhode island': 'RI',
    'district of columbia': 'DC'
  };
  
  return stateMap[normalizedState] || stateName;
}

// Helper function to create Printful order
async function createPrintfulOrder(shippingInfo, cart) {
  try {
    // Debug logging
    console.log('Original country:', shippingInfo.country);
    const mappedCountry = getCountryCode(shippingInfo.country);
    console.log('Mapped country code:', mappedCountry);
    
    // Prepare recipient information
    const recipient = {
      name: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
      address1: shippingInfo.address1,
      address2: shippingInfo.address2 || null,
      city: shippingInfo.city,
      state_code: mappedCountry === 'US' ? getStateCode(shippingInfo.state) : shippingInfo.state,
      country_code: mappedCountry,
      zip: shippingInfo.postalCode,
      phone: shippingInfo.phone || null,
      email: shippingInfo.email
    };

    // Prepare items for Printful
    const items = cart.map(item => {
      const orderItem = {
        quantity: item.quantity,
        retail_price: item.price.toString()
      };
      
      // Use sync_variant_id if available, otherwise use variant_id
      if (item.sync_variant_id) {
        orderItem.sync_variant_id = item.sync_variant_id;
      } else if (item.variant_id) {
        orderItem.variant_id = item.variant_id;
      } else {
        throw new Error(`No variant ID found for item: ${item.name}`);
      }
      
      return orderItem;
    });

    // Create order payload
    const orderData = {
      recipient,
      items,
      shipping: "STANDARD", // You can make this configurable
      notes: `BUXDAO Merch Order - Paid with USDC`
    };

    console.log('Creating Printful order with data:', orderData);

    // Make API call to Printful
    const response = await axios.post(`${PRINTFUL_API_URL}/orders`, orderData, {
      headers: {
        'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Printful order created:', response.data);
    return response.data.result;
  } catch (error) {
    console.error('Printful order creation error:', error.response?.data || error.message);
    throw new Error(`Failed to create Printful order: ${error.response?.data?.error?.message || error.message}`);
  }
}

// POST /api/printful/order
router.post('/order', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { shippingInfo, cart, txSignature, email, wallet_address, skipPayment } = req.body;
    if (!shippingInfo || !cart || !email || !wallet_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // If skipPayment is true, do not check for payment, just place Printful order
    let printfulOrder = null;
    if (skipPayment) {
      try {
        printfulOrder = await createPrintfulOrder(shippingInfo, cart);
      } catch (printfulError) {
        console.error('Printful order creation failed:', printfulError);
        return res.status(500).json({ error: 'Failed to create Printful order' });
      }
      // Store order in DB as pending_payment
      await client.query('BEGIN');
      const dbOrder = await client.query(
        `INSERT INTO orders (wallet_address, cart, shipping_info, status, printful_order_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [wallet_address, JSON.stringify(cart), JSON.stringify(shippingInfo), 'pending_payment', printfulOrder.id]
      );
      await client.query('COMMIT');
      return res.json({ success: true, printful_order_id: printfulOrder.id, order_id: dbOrder.rows[0].id });
    }

    // Check if this is a test transaction
    const isTestTransaction = txSignature.startsWith('test_transaction_');
    
    if (!isTestTransaction) {
      // Validate Solana transaction (only for real transactions)
      const tx = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed' });
      if (!tx) return res.status(400).json({ error: 'Transaction not found' });

      // Find USDC transfer to project wallet
      const usdcTransfer = tx.transaction.message.instructions.find(inst => {
        return (
          inst.parsed &&
          inst.parsed.type === 'transfer' &&
          inst.parsed.info.mint === USDC_MINT &&
          inst.parsed.info.destination === PROJECT_WALLET
        );
      });
      if (!usdcTransfer) return res.status(400).json({ error: 'USDC payment to project wallet not found' });

      // Calculate total price in USDC (from cart)
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      // USDC has 6 decimals
      const expectedAmount = Math.round(total * 1e6);
      if (parseInt(usdcTransfer.parsed.info.amount) < expectedAmount) {
        return res.status(400).json({ error: 'Insufficient USDC payment' });
      }
    } else {
      console.log('Test transaction detected - skipping payment verification');
    }

    // Create Printful order
    try {
      printfulOrder = await createPrintfulOrder(shippingInfo, cart);
    } catch (printfulError) {
      console.error('Printful order creation failed:', printfulError);
      // Continue with database storage even if Printful fails
      // You might want to handle this differently based on your requirements
    }

    // Store order in database
    await client.query('BEGIN');
    
    const dbOrder = await client.query(
      `INSERT INTO orders (wallet_address, tx_signature, cart, shipping_info, status, printful_order_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        wallet_address,
        txSignature,
        JSON.stringify(cart),
        JSON.stringify(shippingInfo),
        printfulOrder ? 'processing' : 'pending_printful',
        printfulOrder?.id || null
      ]
    );

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      order_id: dbOrder.rows[0].id,
      printful_order_id: printfulOrder?.id || null,
      message: 'Order created successfully',
      is_test: isTestTransaction
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order processing error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/printful/order/pay
router.post('/order/pay', async (req, res) => {
  const client = await pool.connect();
  try {
    const { printful_order_id, txSignature, wallet_address, cart, shippingInfo } = req.body;
    if (!printful_order_id || !txSignature || !wallet_address) {
      console.error('Missing required fields:', { printful_order_id, txSignature, wallet_address });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Validate SOL payment (check txSignature for SOL transfer to project wallet)
    const tx = await connection.getParsedTransaction(txSignature, { commitment: 'confirmed' });
    if (!tx) {
      console.error('Transaction not found:', txSignature);
      return res.status(400).json({ error: 'Transaction not found' });
    }
    // Find SOL transfer to project wallet
    const solTransfer = tx.transaction.message.instructions.find(inst => {
      return (
        inst.parsed &&
        inst.parsed.type === 'transfer' &&
        inst.parsed.info.destination === PROJECT_WALLET &&
        inst.parsed.info.source === wallet_address
      );
    });
    if (!solTransfer) {
      console.error('SOL payment to project wallet not found:', { txSignature, wallet_address, PROJECT_WALLET });
      return res.status(400).json({ error: 'SOL payment to project wallet not found' });
    }
    // Update order in DB to processing
    await client.query('BEGIN');
    const updateOrder = await client.query(
      `UPDATE orders SET status = 'processing', tx_signature = $1, updated_at = NOW() WHERE printful_order_id = $2 AND wallet_address = $3 RETURNING *`,
      [txSignature, printful_order_id, wallet_address]
    );
    await client.query('COMMIT');
    if (updateOrder.rows.length === 0) {
      console.error('No order found to update for printful_order_id and wallet_address:', { printful_order_id, wallet_address });
      return res.status(400).json({ error: 'Order not found for this payment' });
    }
    res.json({ success: true, order: updateOrder.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order payment finalization error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/printful/order/:wallet_address
router.get('/order/:wallet_address', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { wallet_address } = req.params;
    
    const result = await client.query(
      `SELECT * FROM orders WHERE wallet_address = $1 ORDER BY created_at DESC`,
      [wallet_address]
    );
    
    res.json({ 
      success: true, 
      orders: result.rows 
    });
    
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// GET /api/printful/order/status/:order_id
router.get('/order/status/:order_id', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { order_id } = req.params;
    
    const result = await client.query(
      `SELECT * FROM orders WHERE id = $1`,
      [order_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = result.rows[0];
    
    // If we have a Printful order ID, try to get the latest status
    if (order.printful_order_id) {
      try {
        const printfulResponse = await axios.get(
          `${PRINTFUL_API_URL}/orders/${order.printful_order_id}`,
          {
            headers: {
              'Authorization': `Bearer ${PRINTFUL_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        order.printful_status = printfulResponse.data.result.status;
        order.printful_details = printfulResponse.data.result;
      } catch (printfulError) {
        console.error('Error fetching Printful order status:', printfulError);
        order.printful_status = 'unknown';
      }
    }
    
    res.json({ 
      success: true, 
      order 
    });
    
  } catch (err) {
    console.error('Error fetching order status:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

export default router; 