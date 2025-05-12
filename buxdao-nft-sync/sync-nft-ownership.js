// Load environment variables first
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: `${__dirname}/.env` });

import { Connection, PublicKey } from '@solana/web3.js';
import { pool } from './api/config/database.js';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { sendActivityNotification } from './api/integrations/discord/notifications.js';
import pkg from 'pg';
const { Pool } = pkg;

// Log environment check
console.log('Environment check:', {
  botToken: process.env.DISCORD_BOT_TOKEN ? 'Present' : 'Missing',
  channelId: process.env.DISCORD_ACTIVITY_CHANNEL_ID,
  nodeEnv: process.env.NODE_ENV
});

// Marketplace escrow wallets
const MARKETPLACE_ESCROWS = {
  MAGICEDEN: {
    id: '1BWutmTvYPwDtmw9abTkS4Ssr8no61spGAvW1X6NDix',
    name: 'Magic Eden'
  },
  TENSOR: {
    id: '4zdNGgAtFsW1cQgHqkiWyRsxaAgxrSRRynnuunxzjxue',
    name: 'Tensor'
  }
};

// Create sets for easier lookup
const ESCROW_WALLETS = new Set(Object.values(MARKETPLACE_ESCROWS).map(m => m.id));

// Get marketplace name from escrow address
function getMarketplaceName(address) {
  return Object.values(MARKETPLACE_ESCROWS).find(m => m.id === address)?.name || 'Unknown';
}

// Batch size for RPC requests
const BATCH_SIZE = 25;
const RATE_LIMIT_DELAY = 1000; // 1 second between batches

// Rate limiting helper with increased delay
async function rateLimit() {
  await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
}

async function logToFile(category, data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = path.join(process.cwd(), 'logs');
  
  // Ensure logs directory exists
  await fs.mkdir(logDir, { recursive: true });
  
  const logFile = path.join(logDir, `${category}-${timestamp}.json`);
  await fs.writeFile(logFile, JSON.stringify(data, null, 2));
  console.log(`Logged ${category} to ${logFile}`);
}

// Add after the existing logToFile function
async function logOwnershipChange(change) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logDir = path.join(process.cwd(), 'logs', 'ownership-changes');
  
  // Ensure logs directory exists
  await fs.mkdir(logDir, { recursive: true });
  
  const logFile = path.join(logDir, `ownership-changes-${timestamp}.json`);
  
  // Read existing changes if file exists
  let changes = [];
  try {
    const existing = await fs.readFile(logFile, 'utf8');
    changes = JSON.parse(existing);
  } catch (error) {
    // File doesn't exist yet, start with empty array
  }
  
  // Add new change with timestamp
  changes.push({
    ...change,
    timestamp: new Date().toISOString(),
    notificationSent: false
  });
  
  await fs.writeFile(logFile, JSON.stringify(changes, null, 2));
  console.log(`Logged ownership change to ${logFile}`);
}

// Extract prices from transaction
async function extractPricesFromTransaction(connection, tokenAccount) {
  try {
    // Get most recent transaction
    const signature = (await connection.getSignaturesForAddress(tokenAccount, { limit: 1 }))[0]?.signature;
    if (!signature) {
      console.log('No recent transaction found');
      return null;
    }

    const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });
    if (!tx) {
      console.log('Could not fetch transaction');
      return null;
    }

    let salePrice = 0;
    let listPrice = 0;
    let marketplace = null;

    // Log transaction type for debugging
    console.log('\nChecking transaction instructions:');
    tx.meta.logMessages.forEach(log => {
      if (log.includes('Instruction:')) {
        console.log(log);
      }
    });

    // Check for Tensor instructions
    const tensorIx = tx.transaction.message.compiledInstructions.find((ix, index) => {
      const programId = tx.transaction.message.staticAccountKeys[ix.programIdIndex].toString();
      return programId === 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN';
    });

    if (tensorIx) {
      console.log('Found Tensor instruction');
      const data = Buffer.from(tensorIx.data);
      const discriminator = data[0];

      // Check for Tensor List instruction (0x36)
      if (discriminator === 0x36) {
        console.log('Found Tensor List instruction');
        // Price is 8 bytes at offset 8 (little-endian)
        const priceInLamports = data.readBigUInt64LE(8);
        listPrice = Number(priceInLamports) / 1e9;
        marketplace = 'Tensor';
        console.log(`Tensor list price: ${listPrice} SOL`);
      }
      
      // TODO: Add Tensor sale price extraction when we identify the sale instruction discriminator
    }

    // Check for Magic Eden instructions in program logs
    const isMEListing = tx.meta.logMessages.some(log => 
      log.includes('Instruction: List') || 
      log.includes('Instruction: Sell')
    );
    const isMESale = tx.meta.logMessages.some(log => 
      log.includes('Instruction: ExecuteSaleV2') || 
      log.includes('Instruction: ExecuteSale')
    );

    if (isMEListing || isMESale) {
      console.log('Found Magic Eden instruction');
      marketplace = 'Magic Eden';

      // Try to get price from program logs first
      const priceLog = tx.meta.logMessages?.find(log => log.includes('"price":'));
      if (priceLog) {
        try {
          console.log('Found price log:', priceLog);
          const logData = JSON.parse(priceLog.slice(priceLog.indexOf('{')));
          const priceInLamports = Number(logData.price);
          const priceInSol = priceInLamports / 1e9;

          if (priceInSol > 0) {
            if (isMESale) {
              salePrice = priceInSol;
              console.log(`Found ME sale price in logs: ${salePrice} SOL`);
            } else if (isMEListing) {
              listPrice = priceInSol;
              console.log(`Found ME list price in logs: ${listPrice} SOL`);
            }
          }
        } catch (e) {
          console.log('Error parsing price from logs:', e);
        }
      }

      // If we couldn't get price from logs, try balance changes
      if (salePrice === 0 && listPrice === 0 && tx.meta.preBalances && tx.meta.postBalances) {
        console.log('No price found in logs, checking balance changes...');
        
        const preBalances = tx.meta.preBalances;
        const postBalances = tx.meta.postBalances;
        const accountKeys = tx.transaction.message.accountKeys;

        // Find the largest balance change
        let maxDiff = 0;
        for (let i = 0; i < accountKeys.length; i++) {
          const balanceDiff = (postBalances[i] - preBalances[i]) / 1e9;
          if (Math.abs(balanceDiff) > Math.abs(maxDiff)) {
            maxDiff = balanceDiff;
          }
        }

        // Negative diff indicates payment (sale), positive indicates receipt (listing)
        if (maxDiff < 0 && isMEListing) {
          listPrice = Math.abs(maxDiff);
          console.log(`Found ME list price from balance changes: ${listPrice} SOL`);
        } else if (maxDiff > 0 && isMESale) {
          salePrice = maxDiff;
          console.log(`Found ME sale price from balance changes: ${salePrice} SOL`);
        }
      }
    }

    // Validate prices are reasonable (between 0.01 and 100,000 SOL)
    const validatePrice = (price) => price >= 0.01 && price <= 100000;
    
    if (salePrice > 0 && !validatePrice(salePrice)) {
      console.log(`Sale price ${salePrice} SOL seems unreasonable (must be between 0.01 and 100,000 SOL), ignoring`);
      salePrice = 0;
    }
    
    if (listPrice > 0 && !validatePrice(listPrice)) {
      console.log(`List price ${listPrice} SOL seems unreasonable (must be between 0.01 and 100,000 SOL), ignoring`);
      listPrice = 0;
    }

    // Only return prices if we found valid ones
    if (salePrice > 0 || listPrice > 0) {
      return { salePrice, listPrice, marketplace };
    }

    console.log('No valid prices found in transaction');
    return null;

  } catch (error) {
    console.error('Error extracting prices from transaction:', error);
    return null;
  }
}

// Format Discord message
function formatDiscordMessage(data) {
    const { type, nft, owner, oldOwner, listPrice, marketplace } = data;

    const getCollectionLogo = (symbol) => {
        const logos = {
            'FCKEDCATZ': '/logos/cat.PNG',
            'CelebCatz': '/logos/celeb.PNG',
            'MM': '/logos/mm.PNG',
            'MM3D': '/logos/mm3d.PNG',
            'AIBITBOTS': '/logos/bitbot.PNG'
        };
        return logos[symbol] || '/logos/buxdao.PNG';
    };

    const getDisplayName = (wallet, discordName) => {
        if (discordName) {
            return discordName;
        }
        return wallet.slice(0, 4) + '...' + wallet.slice(-4);
    };

    const getMarketplaceLinks = (mint) => 
        `[View on Magic Eden](https://magiceden.io/item-details/${mint}) • [View on Tensor](https://www.tensor.trade/item/${mint})`;

    const getImageUrl = (imageUrl, symbol, name) => {
        if (!imageUrl) return null;
        if (imageUrl.startsWith('http')) return imageUrl;
        return `https://buxdao.com${imageUrl}`;
    };

    const baseEmbed = {
        color: 0x00ff00,
        title: `${nft.name}`,
        url: `https://buxdao.com/nft/${nft.mint}`,
        thumbnail: {
            url: getImageUrl(nft.image, nft.symbol, nft.name)
        },
        fields: [
            {
                name: 'Links',
                value: getMarketplaceLinks(nft.mint),
                inline: false
            }
        ],
        timestamp: new Date().toISOString()
    };

    switch (type) {
        case 'listed':
            return {
                ...baseEmbed,
                color: 0x00ff00,
                description: `🎯 **Listed for Sale**`,
                fields: [
                    {
                        name: 'Listed By',
                        value: getDisplayName(owner.wallet, owner.discord),
                        inline: true
                    },
                    {
                        name: 'List Price',
                        value: `${listPrice.toFixed(2)} SOL`,
                        inline: true
                    },
                    {
                        name: 'Marketplace',
                        value: marketplace || 'Unknown',
                        inline: true
                    },
                    {
                        name: 'Links',
                        value: getMarketplaceLinks(nft.mint),
                        inline: false
                    }
                ]
            };

        case 'delisted':
            return {
                ...baseEmbed,
                color: 0xff0000,
                description: `❌ **Delisted from Sale**`,
                fields: [
                    {
                        name: 'Delisted By',
                        value: getDisplayName(owner.wallet, owner.discord),
                        inline: true
                    },
                    {
                        name: 'Links',
                        value: getMarketplaceLinks(nft.mint),
                        inline: false
                    }
                ]
            };

        case 'sold':
            return {
                ...baseEmbed,
                color: 0x00ff00,
                description: `💰 **Sold**`,
                fields: [
                    {
                        name: 'From',
                        value: getDisplayName(oldOwner.wallet, oldOwner.discord),
                        inline: true
                    },
                    {
                        name: 'To',
                        value: getDisplayName(owner.wallet, owner.discord),
                        inline: true
                    },
                    {
                        name: 'Sale Price',
                        value: `${listPrice.toFixed(2)} SOL`,
                        inline: true
                    },
                    {
                        name: 'Links',
                        value: getMarketplaceLinks(nft.mint),
                        inline: false
                    }
                ]
            };

        case 'transferred':
            return {
                ...baseEmbed,
                color: 0x00ff00,
                description: `🔄 **Transferred**`,
                fields: [
                    {
                        name: 'From',
                        value: getDisplayName(oldOwner.wallet, oldOwner.discord),
                        inline: true
                    },
                    {
                        name: 'To',
                        value: getDisplayName(owner.wallet, owner.discord),
                        inline: true
                    },
                    {
                        name: 'Links',
                        value: getMarketplaceLinks(nft.mint),
                        inline: false
                    }
                ]
            };

        default:
            return baseEmbed;
    }
}

// Send Discord notification using Discord API directly
async function sendDiscordNotification(data) {
  try {
    const message = formatDiscordMessage(data);
    const success = await sendActivityNotification(message);
    
    if (!success) {
      throw new Error('Failed to send Discord notification');
    }
    
    // Log successful notification
    await logOwnershipChange({
      type: data.type,
      nft: data.nft,
      notificationSent: true,
      notificationTimestamp: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error sending Discord notification:', error.message);
    
    // Log failed notification
    await logOwnershipChange({
      type: data.type,
      nft: data.nft,
      notificationSent: false,
      error: error.message
    });
    
    return false;
  }
}

// Function to determine ownership change type and fetch required data
async function determineOwnershipChange(connection, tokenAccount, currentOwner, previousOwner, originalLister) {
  // Case 1: No current owner (potentially burned)
  if (!currentOwner) {
    return { 
      type: 'potential_burn', 
      details: { 
        previousOwner,
        originalLister,
        note: 'No current owner found - needs verification'
      }
    };
  }

  // Case 2: Direct transfer between wallets
  if (!ESCROW_WALLETS.has(currentOwner) && !ESCROW_WALLETS.has(previousOwner)) {
      return { 
      type: 'transfer', 
        details: { 
        newOwner: currentOwner,
          previousOwner,
        note: 'Direct transfer between wallets'
        }
      };
    }

  // Case 3: Delist (was in escrow, now back to original lister)
  if (ESCROW_WALLETS.has(previousOwner) && currentOwner === originalLister) {
    return { 
      type: 'delist', 
      details: { 
        newOwner: currentOwner,
        previousOwner,
        marketplace: getMarketplaceName(previousOwner),
        note: 'NFT delisted and returned to original lister'
      }
    };
  }

  // Case 4: Sale (was in escrow, now owned by someone else)
  if (ESCROW_WALLETS.has(previousOwner) && currentOwner !== originalLister) {
    const prices = await extractPricesFromTransaction(connection, tokenAccount);
      return { 
      type: 'sale', 
        details: { 
        newOwner: currentOwner,
          previousOwner,
        marketplace: getMarketplaceName(previousOwner),
        salePrice: prices?.salePrice || null,
        note: prices?.salePrice ? 'Sale with price' : 'Sale without price'
        }
      };
    }

  // Case 5: New listing (now in escrow)
  if (ESCROW_WALLETS.has(currentOwner) && !ESCROW_WALLETS.has(previousOwner)) {
    const prices = await extractPricesFromTransaction(connection, tokenAccount);
    return { 
      type: 'listing', 
      details: { 
        marketplace: getMarketplaceName(currentOwner),
        originalOwner: previousOwner,
        listPrice: prices?.listPrice || null,
        note: prices?.listPrice ? 'Listing with price' : 'Listing without price'
      }
    };
  }

  // Case 6: Unknown change
  return { 
    type: 'unknown_change', 
    details: { 
      currentOwner,
      previousOwner,
      originalLister,
      note: 'Unhandled ownership change type'
    }
  };
}

// Add connection retry logic
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function withRetry(fn, retries = MAX_RETRIES) {
  try {
    return await fn();
  } catch (error) {
    console.error('Error in withRetry:', {
      message: error.message,
      code: error.code,
      retriesLeft: retries
    });

    // Handle specific RPC errors
    if ((error.message?.includes('Bad Request') || 
         error.message?.includes('429') ||
         error.code === 'ETIMEDOUT') && retries > 0) {
      console.log(`RPC error, retrying in ${RETRY_DELAY/1000} seconds... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

// Collection addresses
const COLLECTIONS = {
  // Main Collections
  FCKEDCATZ: 'EPeeeDr21EPJ4GJgjuRJ8SHD4A2d59erMaTtWaTT2hqm',
  CelebCatz: 'H6c8gJqMk2ktfKriGGLB14RKPAz2otz1iPv2AAegetXD', 
  MM: '3EyhWtevHSkXg4cGsCurLLJ1NEc3rR3fWrYBx5CVLn7R',
  MM3D: 'HLD74kSbBLf4aYnGkZ4dYSoh9cZvS4exAB9t7pPDDPvE', 
  AIBB: '41swUeWc8Hm87T7ahtndUWfDTLRWndWYFpuE4UKp79Vq',
  
  // Collab Collections
  AELxAIBB: 'EiWQMsSysgAKofe8EVtVSjeCxv1DXJJ4BCiH3gbYF4K7', // AI Energy Apes
  AIRB: '4obz5pRAjZyV2zE4dbpSfhtagQcWt6W3UdJ6FqsCGnLE',      // Rejected Bots
  AUSQRL: 'GLN64oj3rQq4qy93P9YV5xF8U2veiFcGbGaTTZQhPoj5',   // AI Secret Squirrels
  DDBOT: 'A5FjnNDwXprq7rRmoHn7fhimcDsmMdn579WX9MqBem9Y',    // Doodle Bots
  CLB: 'CLPKnYaB5JdCBMBJJ32W1qXoYC3kShxT3sxPLuVVFgD7'       // Candy Bots
  
  // Note: SHxBB (A.I Warriors) is not included as it was our first collab
  // and does not have a verified on-chain collection address
};

// Function to fetch all NFTs in a collection
async function fetchCollectionNFTs(connection, collectionAddress) {
  try {
    if (!process.env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY environment variable is not set');
    }

    // Get collection symbol from address
    const collectionSymbol = Object.entries(COLLECTIONS).find(([_, addr]) => addr === collectionAddress)?.[0];
    if (!collectionSymbol) {
      throw new Error(`Unknown collection address: ${collectionAddress}`);
    }

    console.log(`\nFetching NFTs for ${collectionSymbol} (${collectionAddress})...`);

    let allNFTs = [];
    let page = 1;
    const PAGE_SIZE = 1000; // Helius max page size
    let hasMore = true;

    while (hasMore) {
      console.log(`\nFetching page ${page} for ${collectionSymbol} (${allNFTs.length} NFTs so far)`);
      
      const requestBody = {
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAssetsByGroup',
        params: {
          groupKey: 'collection',
          groupValue: collectionAddress,
          page,
          limit: PAGE_SIZE
        }
      };
      
      const response = await axios.post(
        `https://rpc.helius.xyz/?api-key=${process.env.HELIUS_API_KEY}`,
        requestBody,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.error) {
        console.error(`Helius API error for ${collectionSymbol}:`, response.data.error);
      throw new Error(`Helius API error: ${response.data.error.message}`);
    }

      const items = response.data.result.items;
      if (!items || items.length === 0) {
        console.log(`No more items found for ${collectionSymbol}`);
        hasMore = false;
        break;
      }

      // Log first NFT of each page for debugging
      if (items.length > 0) {
        const firstNFT = items[0];
        console.log(`Sample NFT from page ${page}:`, {
          mint: firstNFT.id,
          name: firstNFT.content.metadata.name,
          owner: firstNFT.ownership.owner,
          collection: collectionSymbol
        });
      }

      allNFTs.push(...items);
      
      // Add delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      page++;
    }

    console.log(`\nFetched total of ${allNFTs.length} NFTs for ${collectionSymbol}`);
    return allNFTs;
  } catch (error) {
    console.error(`Error fetching collection NFTs for ${collectionAddress}:`, error);
    return [];
  }
}

// Add test mode flag at the top with other constants
const TEST_MODE = process.env.TEST_MODE === 'true';

// Add test logging function
async function logTestChange(change) {
  const timestamp = new Date().toISOString();
  console.log('\n=== Test Mode Change ===');
  console.log('Timestamp:', timestamp);
  console.log('Change Type:', change.type);
  console.log('NFT:', {
    mint: change.nft.mint_address,
    name: change.nft.name,
    symbol: change.nft.symbol,
    currentOwner: change.nft.owner_wallet,
    previousOwner: change.previousOwner,
    originalLister: change.nft.original_lister
  });
  
  // Add detailed logging based on change type
  switch (change.type) {
    case 'listing':
      console.log('Listing Details:', {
        marketplace: change.details.marketplace,
        listPrice: change.details.listPrice,
        originalOwner: change.details.originalOwner,
        note: change.details.note
      });
      break;
    case 'sale':
      console.log('Sale Details:', {
        marketplace: change.details.marketplace,
        salePrice: change.details.salePrice,
        newOwner: change.details.newOwner,
        note: change.details.note
      });
      break;
    case 'transfer':
      console.log('Transfer Details:', {
        newOwner: change.details.newOwner,
        previousOwner: change.details.previousOwner,
        note: change.details.note
      });
      break;
    case 'delist':
      console.log('Delist Details:', {
        newOwner: change.details.newOwner,
        marketplace: change.details.marketplace,
        note: change.details.note
      });
      break;
    case 'potential_burn':
      console.log('Potential Burn Details:', {
        previousOwner: change.details.previousOwner,
        note: change.details.note
      });
      break;
    case 'unknown_change':
      console.log('Unknown Change Details:', {
        currentOwner: change.details.currentOwner,
        previousOwner: change.details.previousOwner,
        note: change.details.note
      });
      break;
  }
  console.log('========================\n');
}

// Modify handleOwnershipChange to support test mode
async function handleOwnershipChange(client, nft, dbNFT, change) {
  try {
    console.log(`\nProcessing ownership change for ${nft.id}:`);
    console.log(`Change type: ${change.type}`);
    console.log(`New owner: ${nft.ownership.owner}`);
    console.log(`Old owner: ${dbNFT.owner_wallet}`);

    // Look up discord names for all relevant wallets
    const ownerDiscord = await getDiscordNameForWallet(client, nft.ownership.owner);
    const oldOwnerDiscord = await getDiscordNameForWallet(client, dbNFT.owner_wallet);
    const originalListerDiscord = await getDiscordNameForWallet(client, dbNFT.lister_discord_name);

    console.log(`New owner Discord: ${ownerDiscord}`);
    console.log(`Old owner Discord: ${oldOwnerDiscord}`);
    console.log(`Original lister Discord: ${originalListerDiscord}`);

    // Get transaction history to check for listing events
    let listPrice = null;
    let listerDiscord = null;
    let marketplace = null;

    if (change.type === 'listed') {
        try {
            console.log(`\nFetching transaction history for ${nft.id}...`);
            const response = await fetch(`https://api.helius.xyz/v0/addresses/${nft.id}/transactions?api-key=${process.env.HELIUS_API_KEY}`);
            const transactions = await response.json();
            
            console.log(`Found ${transactions.length} transactions`);
            
            // Look for the most recent listing event
            const listingTx = transactions.find(tx => 
                tx.events?.nft?.type === 'NFT_LISTING' && 
                tx.events?.nft?.nfts?.some(n => n.mint === nft.id)
            );

            if (listingTx) {
                console.log('Found listing transaction:', listingTx.events.nft);
                listPrice = listingTx.events.nft.amount / 1e9; // Convert lamports to SOL
                listerDiscord = await getDiscordNameForWallet(client, listingTx.events.nft.seller);
                marketplace = listingTx.events.nft.source;
                console.log(`List price: ${listPrice} SOL`);
                console.log(`Lister: ${listerDiscord}`);
                console.log(`Marketplace: ${marketplace}`);
            } else {
                console.log('No listing transaction found');
            }
        } catch (error) {
            console.error('Error fetching transaction history:', error);
        }
    }

    // Update database based on change type
    switch (change.type) {
        case 'listed':
            if (!listPrice) {
                console.log('No valid list price found, skipping notification');
                return;
            }
            await pool.query(
                `UPDATE nft_metadata 
                 SET is_listed = true, 
                     list_price = $1,
                     lister_discord_name = $2,
                     marketplace = $3,
                     last_updated = NOW()
                 WHERE mint_address = $4`,
                [listPrice, listerDiscord, marketplace, nft.id]
            );
            break;

        case 'delisted':
            await pool.query(
                `UPDATE nft_metadata 
                 SET is_listed = false, 
                     list_price = NULL,
                     lister_discord_name = NULL,
                     marketplace = NULL,
                     last_updated = NOW()
                 WHERE mint_address = $1`,
                [nft.id]
            );
            break;

        case 'sold':
            await pool.query(
                `UPDATE nft_metadata 
                 SET is_listed = false, 
                     list_price = NULL,
                     lister_discord_name = NULL,
                     marketplace = NULL,
                     last_sale_price = $1,
                     last_updated = NOW()
                 WHERE mint_address = $2`,
                [listPrice, nft.id]
            );
            break;

        case 'transferred':
            await pool.query(
                `UPDATE nft_metadata 
                 SET owner_wallet = $1,
                     owner_discord_id = $2,
                     owner_name = $3,
                     is_listed = false,
                     list_price = NULL,
                     lister_discord_name = NULL,
                     marketplace = NULL,
                     last_updated = NOW()
                 WHERE mint_address = $4`,
                [nft.ownership.owner, ownerDiscord, ownerDiscord, nft.id]
            );
            break;
    }

    // Send Discord notification
    const notification = {
        type: change.type,
        nft: {
            name: nft.name,
            mint: nft.id,
            image: nft.image
        },
        owner: {
            wallet: nft.ownership.owner,
            discord: ownerDiscord
        },
        oldOwner: {
            wallet: dbNFT.owner_wallet,
            discord: oldOwnerDiscord
        },
        listPrice: listPrice,
        marketplace: marketplace
    };

    await sendDiscordNotification(notification);
    console.log('Discord notification sent successfully');

  } catch (error) {
    console.error('Error handling ownership change:', error);
  }
}

// Modify syncNFTOwnership to support test mode
async function syncNFTOwnership() {
  if (TEST_MODE) {
    console.log('\n=== RUNNING IN TEST MODE - NO DATABASE CHANGES WILL BE MADE ===\n');
  }

  const connection = new Connection(process.env.QUICKNODE_RPC_URL, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
    disableRetryOnRateLimit: false,
  });

  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  
  const client = await pool.connect();
  
  // Add summary tracking object
  const summary = {
    totalCollections: Object.keys(COLLECTIONS).length,
    collectionsProcessed: 0,
    totalNFTsFound: 0,
    totalNFTsInDB: 0,
    newNFTsFound: 0,
    ownershipChanges: {
      transfers: 0,
      sales: 0,
      listings: 0,
      delists: 0,
      burns: 0
    },
    collectionDetails: {}
  };
  
  try {
    console.log('\nStarting NFT ownership sync...');
    console.log('\nCollections to process:', Object.keys(COLLECTIONS).join(', '));
    
    // Process each collection
    for (const [collectionName, collectionAddress] of Object.entries(COLLECTIONS)) {
      console.log(`\n=== Processing ${collectionName} collection (${collectionAddress}) ===`);
      
      // Initialize collection details in summary
      summary.collectionDetails[collectionName] = {
        nftsFound: 0,
        nftsInDB: 0,
        newNFTs: 0,
        ownershipChanges: {
          transfers: 0,
          sales: 0,
          listings: 0,
          delists: 0,
          burns: 0
        }
      };
      
      // Fetch all NFTs in the collection
      console.log(`Fetching NFTs for ${collectionName}...`);
      const collectionNFTs = await fetchCollectionNFTs(connection, collectionAddress);
      console.log(`Found ${collectionNFTs.length} NFTs in ${collectionName}`);
      
      if (collectionNFTs.length === 0) {
        console.log(`No NFTs found for ${collectionName} - skipping`);
        continue;
      }
      
      // Update summary with NFTs found
      summary.totalNFTsFound += collectionNFTs.length;
      summary.collectionDetails[collectionName].nftsFound = collectionNFTs.length;
      
      // Get current database state for this collection
      console.log(`Fetching database state for ${collectionName}...`);
      const { rows: dbNFTs } = await client.query(
        `SELECT 
          mint_address, 
          name,
          symbol,
          owner_wallet,
          original_lister,
          is_listed,
          marketplace,
          list_price,
          last_sale_price,
          rarity_rank,
          image_url,
          owner_discord_id,
          owner_name,
          lister_discord_name
        FROM nft_metadata 
        WHERE symbol = $1`,
        [collectionName]
      );
      
      // Update summary with DB counts
      summary.totalNFTsInDB += dbNFTs.length;
      summary.collectionDetails[collectionName].nftsInDB = dbNFTs.length;
      
      console.log(`\nDatabase state for ${collectionName}:`);
      console.log(`- Total NFTs in database: ${dbNFTs.length}`);
      console.log(`- Total NFTs in collection: ${collectionNFTs.length}`);
      console.log(`- NFTs in DB but not in collection: ${dbNFTs.filter(dbNFT => !collectionNFTs.find(nft => nft.id === dbNFT.mint_address)).length}`);
      console.log(`- NFTs in collection but not in DB: ${collectionNFTs.filter(nft => !dbNFTs.find(dbNFT => dbNFT.mint_address === nft.id)).length}`);
      console.log(`- NFTs with potential ownership changes: ${collectionNFTs.filter(nft => {
        const dbNFT = dbNFTs.find(dbNFT => dbNFT.mint_address === nft.id);
        return dbNFT && dbNFT.owner_wallet !== nft.ownership.owner;
      }).length}`);
      
      // Create maps for quick lookup
      const dbNFTMap = new Map(dbNFTs.map(nft => [nft.mint_address, nft]));
      const collectionNFTMap = new Map(collectionNFTs.map(nft => [nft.id, nft]));
      
      // Process each NFT in the collection
      for (const nft of collectionNFTs) {
        const dbNFT = dbNFTMap.get(nft.id);
        
        if (!dbNFT) {
          summary.newNFTsFound++;
          summary.collectionDetails[collectionName].newNFTs++;
          if (TEST_MODE) {
            console.log(`\nTest Mode: New NFT Found:`, {
              mint: nft.id,
              name: nft.content.metadata.name,
              owner: nft.ownership.owner,
              collection: collectionName
            });
          } else {
          // New NFT - insert into database
          await client.query(
            `INSERT INTO nft_metadata (
              mint_address, 
              name, 
              symbol, 
              owner_wallet, 
              image_url, 
              attributes, 
              rarity_rank,
              is_listed,
              marketplace,
              list_price,
              last_sale_price,
              owner_discord_id,
              owner_name,
              lister_discord_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              nft.id,
              nft.content.metadata.name,
              collectionName,
              nft.ownership.owner,
              nft.content.links.image,
              JSON.stringify(nft.content.metadata.attributes),
                null,
                false,
                null,
                null,
                null,
                null,
                null,
                null
              ]
            );
          }
          continue;
        }
        
        // Check for ownership changes
        if (dbNFT.owner_wallet !== nft.ownership.owner) {
          const change = await determineOwnershipChange(
            connection,
            nft.id,
            nft.ownership.owner,
            dbNFT.owner_wallet,
            dbNFT.original_lister
          );
          
          // Update summary with ownership changes
          summary.ownershipChanges[change.type]++;
          summary.collectionDetails[collectionName].ownershipChanges[change.type]++;
          
          if (TEST_MODE) {
            console.log(`\nTest Mode: Ownership Change Detected:`, {
              mint: nft.id,
              name: nft.content.metadata.name,
              type: change.type,
              previous_owner: dbNFT.owner_wallet,
              new_owner: nft.ownership.owner,
              details: change.details
            });
          } else {
          await handleOwnershipChange(client, nft, dbNFT, change);
          }
        } else if (TEST_MODE) {
          console.log(`\nTest Mode: No Change for NFT:`, {
            mint: nft.id,
            name: nft.content.metadata.name,
            owner: nft.ownership.owner,
            collection: collectionName
          });
        }
      }
      
      // Check for NFTs in DB but not in collection
      for (const dbNFT of dbNFTs) {
        if (!collectionNFTMap.has(dbNFT.mint_address)) {
          if (TEST_MODE) {
            console.log(`\nTest Mode: NFT Not Found in Collection:`, {
              mint: dbNFT.mint_address,
              name: dbNFT.name,
              last_known_owner: dbNFT.owner_wallet,
              collection: collectionName
            });
          } else {
            // Handle missing NFT case
          try {
            const nftStatus = await fetch(`https://rpc.helius.xyz/?api-key=${process.env.HELIUS_API_KEY}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 'my-id',
                method: 'getAsset',
                params: { id: dbNFT.mint_address }
              })
            }).then(res => res.json());

            if (nftStatus.result?.burnt === true) {
                summary.ownershipChanges.burns++;
                summary.collectionDetails[collectionName].ownershipChanges.burns++;
                
              await sendDiscordNotification({
                type: 'burned',
                nft: {
                  mint_address: dbNFT.mint_address,
                  name: dbNFT.name,
                  symbol: dbNFT.symbol,
                  owner_wallet: dbNFT.owner_wallet,
                  original_lister: dbNFT.original_lister,
                  rarity_rank: dbNFT.rarity_rank,
                  image_url: dbNFT.image_url
                }
              });
              
              await client.query(
                `DELETE FROM nft_metadata WHERE mint_address = $1`,
                [dbNFT.mint_address]
              );
            }
          } catch (error) {
            console.error(`Error checking NFT status for ${dbNFT.mint_address}:`, error);
          }
        }
      }
    }

      summary.collectionsProcessed++;
    }
    
    // Display summary
    console.log('\n=== SYNC SUMMARY ===');
    console.log(`Total Collections: ${summary.totalCollections}`);
    console.log(`Collections Processed: ${summary.collectionsProcessed}`);
    console.log(`Total NFTs Found: ${summary.totalNFTsFound}`);
    console.log(`Total NFTs in Database: ${summary.totalNFTsInDB}`);
    console.log(`New NFTs Found: ${summary.newNFTsFound}`);
    console.log('\nOwnership Changes:');
    console.log(`- Transfers: ${summary.ownershipChanges.transfers}`);
    console.log(`- Sales: ${summary.ownershipChanges.sales}`);
    console.log(`- Listings: ${summary.ownershipChanges.listings}`);
    console.log(`- Delists: ${summary.ownershipChanges.delists}`);
    console.log(`- Burns: ${summary.ownershipChanges.burns}`);
    
    console.log('\nCollection Details:');
    for (const [collection, details] of Object.entries(summary.collectionDetails)) {
      console.log(`\n${collection}:`);
      console.log(`- NFTs Found: ${details.nftsFound}`);
      console.log(`- NFTs in DB: ${details.nftsInDB}`);
      console.log(`- New NFTs: ${details.newNFTs}`);
      console.log(`- Ownership Changes:`);
      console.log(`  - Transfers: ${details.ownershipChanges.transfers}`);
      console.log(`  - Sales: ${details.ownershipChanges.sales}`);
      console.log(`  - Listings: ${details.ownershipChanges.listings}`);
      console.log(`  - Delists: ${details.ownershipChanges.delists}`);
      console.log(`  - Burns: ${details.ownershipChanges.burns}`);
    }
    
    console.log('\n=== NFT ownership sync completed successfully ===');
    if (TEST_MODE) {
      console.log('\n=== TEST MODE COMPLETED - NO CHANGES WERE MADE ===');
    }
  } catch (error) {
    console.error('Error during NFT ownership sync:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

function parseTokenAccountData(data) {
  try {
    const dataLayout = {
      mint: { offset: 0, length: 32 },
      owner: { offset: 32, length: 32 },
      amount: { offset: 64, length: 8 }
    };

    const ownerBytes = data.slice(
      dataLayout.owner.offset, 
      dataLayout.owner.offset + dataLayout.owner.length
    );
    
    return {
      owner: new PublicKey(ownerBytes).toBase58()
    };
  } catch (error) {
    console.error('Error parsing token account data:', error);
    return null;
  }
}

// Run the sync if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncNFTOwnership()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

// Export both functions
export { sendDiscordNotification, formatDiscordMessage };
export default syncNFTOwnership;