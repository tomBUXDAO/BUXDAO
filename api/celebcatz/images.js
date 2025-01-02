import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    console.log('Starting database query...');
    const result = await sql`
      SELECT image_url, name 
      FROM nft_metadata 
      WHERE symbol = 'CelebCatz'
      LIMIT 79;
    `;
    console.log('Query completed. Row count:', result.rows?.length);
    
    if (!result.rows || result.rows.length === 0) {
      console.log('No images found');
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    const filteredRows = result.rows.filter(row => {
      const match = row.name?.match(/^Celebrity Catz #(\d+)$/);
      return match && parseInt(match[1]) <= 79;
    });
    console.log('Filtered row count:', filteredRows.length);
    
    return new Response(JSON.stringify(filteredRows), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Database query failed:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch images', 
      details: error.message,
      stack: error.stack 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 