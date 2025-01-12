export const config = {
  runtime: 'edge',
  regions: ['iad1']
};

export default async function handler(req) {
  console.log('Edge Function handler:', req.url);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    console.error('Invalid method:', req.method);
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  try {
    console.log('Fetching from Printful API...');
    
    if (!process.env.PRINTFUL_API_KEY) {
      console.error('PRINTFUL_API_KEY not configured');
      throw new Error('API key not configured');
    }

    // Add a small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch('https://api.printful.com/store/products', {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    console.log('Printful API response status:', response.status);
    console.log('Printful API response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Printful API error:', errorText);
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Invalid content type:', contentType);
      throw new Error('Invalid response format from Printful API');
    }

    const data = await response.json();
    console.log('Printful API data received');

    if (!data.result) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response structure from Printful API');
    }

    // Transform the data
    const products = data.result.map(item => ({
      id: item.id,
      name: item.name,
      thumbnail_url: item.thumbnail_url,
      variants: item.variants || 0,
      sync_product: item.sync_product,
      sync_variants: item.sync_variants || []
    }));

    return new Response(JSON.stringify(products), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Edge Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
} 