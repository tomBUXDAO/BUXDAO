import fetch from 'node-fetch';
import NodeCache from 'node-cache';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

// Create a cache for SOL price with a TTL (e.g., 5 minutes)
const solPriceCache = new NodeCache({ stdTTL: 300 });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // 1 second delay

export async function getSolPrice() {
  let solPrice = solPriceCache.get('solPrice');

  if (solPrice) {
    console.log('Using cached SOL price:', solPrice);
    return solPrice;
  }

  // If no cached price, try fetching with retries
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`Fetching SOL price from CoinGecko (Attempt ${i + 1}/${MAX_RETRIES})...`);
      const solPriceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      
      if (!solPriceResponse.ok) {
        // If it's a rate limit error specifically, wait longer
        if (solPriceResponse.status === 429) {
            console.warn(`CoinGecko rate limited. Waiting ${RETRY_DELAY_MS * (i + 1)}ms before retrying.`);
             await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
             continue; // Try again
        }
        throw new Error(`Failed to fetch SOL price: ${solPriceResponse.statusText}`);
      }
      
      const solPriceData = await solPriceResponse.json();
      const fetchedPrice = Number(solPriceData.solana?.usd);
      if (isNaN(fetchedPrice) || fetchedPrice <= 0) {
        throw new Error('Invalid or non-positive SOL price data received');
      }
      
      solPrice = fetchedPrice;
      solPriceCache.set('solPrice', solPrice);
      console.log('Fetched and cached SOL price:', solPrice);
      return solPrice; // Success!

    } catch (error) {
      console.error(`Error fetching SOL price (Attempt ${i + 1}/${MAX_RETRIES}):`, error.message);
      if (i < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
      }
    }
  }

  // If all retries fail and no cached price exists, return null
  if (!solPriceCache.has('solPrice')) {
      console.error('All SOL price fetch attempts failed and no cached price. Returning null.');
      return null; // Indicate failure
  }
  
  // This part should ideally not be reached if initial check works, but as a fallback
  solPrice = solPriceCache.get('solPrice');
  console.warn('Using cached SOL price after fetch failures:', solPrice);
  return solPrice; 
} 