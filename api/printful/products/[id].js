export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Extract id from URL path
  const url = new URL(req.url);
  const paths = url.pathname.split('/');
  const id = paths[paths.length - 1];

  try {
    console.log(`Fetching Printful product details for ID: ${id}`);
    
    if (!process.env.PRINTFUL_API_KEY) {
      throw new Error('PRINTFUL_API_KEY is not set');
    }

    const response = await fetch(`https://api.printful.com/store/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Printful API error: ${response.status} ${response.statusText}`, errorText);
      return new Response(JSON.stringify({ 
        error: 'Printful API error',
        status: response.status,
        message: response.statusText,
        details: errorText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const data = await response.json();
    
    if (!data.result) {
      console.error('Invalid response format from Printful API:', data);
      return new Response(JSON.stringify({ 
        error: 'Invalid response format from Printful API',
        details: data
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Ensure sync_variants is always an array
    const result = {
      ...data.result,
      sync_variants: data.result.sync_variants || []
    };

    const responseBody = JSON.stringify(result);
    console.log(`Sending response for product ${id}:`, responseBody.slice(0, 200) + '...');

    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60'
      }
    });
  } catch (error) {
    console.error(`Error fetching product ${id} from Printful:`, error);
    return new Response(JSON.stringify({ 
      error: error.message,
      id: id,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 