export const config = {
  runtime: 'edge',
  regions: ['iad1']  // Deploy to US East (N. Virginia)
};

export default async function handler(req) {
  console.log('Edge Function: Handling product details request', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers)
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('Edge Function: Handling CORS preflight');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log('Edge Function: Method not allowed:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // Extract product ID from URL
    const url = new URL(req.url);
    const productId = url.pathname.split('/').pop();
    console.log('Edge Function: Fetching details for product:', productId);
    
    if (!process.env.PRINTFUL_API_KEY) {
      console.error('Edge Function: PRINTFUL_API_KEY is not set');
      throw new Error('PRINTFUL_API_KEY is not set');
    }

    // Add a delay to ensure we're not hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`https://api.printful.com/store/products/${productId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    console.log('Edge Function: Printful API response', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Edge Function: Printful API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      return new Response(JSON.stringify({ 
        error: 'Printful API error',
        status: response.status,
        message: response.statusText,
        details: errorText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      });
    }

    const data = await response.json();
    console.log('Edge Function: Printful API data:', JSON.stringify(data).slice(0, 200) + '...');
    
    if (!data.result) {
      console.error('Edge Function: Invalid response format from Printful API:', data);
      return new Response(JSON.stringify({ 
        error: 'Invalid response format from Printful API',
        details: data
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      });
    }

    const responseBody = JSON.stringify(data.result);
    console.log('Edge Function: Sending response:', responseBody.slice(0, 200) + '...');

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });
  } catch (error) {
    console.error('Edge Function: Error fetching from Printful:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  }
} 