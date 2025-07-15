// Load environment variables first
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

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
  const marketplace = Object.values(MARKETPLACE_ESCROWS).find(m => m.id === address);
  if (!marketplace) return 'Unknown';
  return marketplace.name; // This will return "Magic Eden" or "Tensor"
}

// Collection address
const COLLECTION = {
  name: 'CelebCatz',
  address: 'H6c8gJqMk2ktfKriGGLB14RKPAz2otz1iPv2AAegetXD'
};

// Function to fetch all NFTs in the collection
async function fetchCollectionNFTs(connection) {
  try {
    if (!process.env.HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY environment variable is not set');
    }

    console.log(`\nFetching NFTs for ${COLLECTION.name} (${COLLECTION.address})...`);

    let allNFTs = [];
    let page = 1;
    const PAGE_SIZE = 1000; // Helius max page size
    let hasMore = true;

    while (hasMore) {
      console.log(`\nFetching page ${page} for ${COLLECTION.name} (${allNFTs.length} NFTs so far)`);
      
      const requestBody = {
        jsonrpc: '2.0',
        id: 'my-id',
        method: 'getAssetsByGroup',
        params: {
          groupKey: 'collection',
          groupValue: COLLECTION.address,
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
        console.error(`Helius API error for ${COLLECTION.name}:`, response.data.error);
        throw new Error(`Helius API error: ${response.data.error.message}`);
      }

      const items = response.data.result.items;
      if (!items || items.length === 0) {
        console.log(`No more items found for ${COLLECTION.name}`);
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
          collection: COLLECTION.name
        });
      }

      allNFTs.push(...items);
      
      // Add delay between requests to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));
      
      page++;
    }

    console.log(`\nFetched total of ${allNFTs.length} NFTs for ${COLLECTION.name}`);
    return allNFTs;
  } catch (error) {
    console.error(`Error fetching collection NFTs for ${COLLECTION.address}:`, error);
    return [];
  }
}

// Add test mode flag
const TEST_MODE = process.env.TEST_MODE === 'true';

// Improved function to determine ownership change type by always fetching transaction details
async function determineOwnershipChange(mintAddress, oldOwner, newOwner) {
  try {
    console.log(`\nAnalyzing ownership change for ${mintAddress}:`);
    console.log(`- Old owner: ${oldOwner}`);
    console.log(`- New owner: ${newOwner}`);
    
    // Check if the NFT was burned (no owner)
    if (!newOwner) {
      console.log(`\n🔥 NFT Burned: ${mintAddress}`);
      return { 
        type: 'burned',
        details: {
          previous_owner: oldOwner,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Always fetch recent transaction history for this NFT
    console.log(`Fetching transaction history for ${mintAddress}...`);
    
    const response = await fetch(
      `https://api.helius.xyz/v0/addresses/${mintAddress}/transactions?api-key=${process.env.HELIUS_API_KEY}`
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch transaction history: ${response.statusText}`);
      return { type: 'unknown' };
    }
    
    const transactions = await response.json();
    console.log(`Found ${transactions.length} transactions`);
    
    if (transactions.length === 0) {
      console.log('No transactions found - treating as transfer');
      return { 
        type: 'transfer',
        details: {
          from: oldOwner,
          to: newOwner,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Look for the most recent transaction that involves this ownership change
    // We'll look at the last 5 transactions to find the relevant one
    const recentTransactions = transactions.slice(0, 5);
    
    for (const tx of recentTransactions) {
      console.log(`\nAnalyzing transaction: ${tx.signature}`);
      console.log(`- Type: ${tx.type}`);
      console.log(`- Description: ${tx.description}`);
      
      // Check if this transaction involves our ownership change
      let involvesOwnershipChange = false;
      let transactionType = null;
      let price = null;
      let marketplace = null;
      let buyer = null;
      let seller = null;
      
      // Check NFT events
      if (tx.events?.nft) {
        const nftEvent = tx.events.nft;
        console.log(`- NFT Event:`, nftEvent);
        
        if (nftEvent.type === 'NFT_SALE' || nftEvent.type === 'NFT_BID') {
          transactionType = 'sale';
          price = nftEvent.amount ? nftEvent.amount / 1e9 : null;
          marketplace = nftEvent.source === 'MAGIC_EDEN' ? 'Magic Eden' : 
                       nftEvent.source === 'TENSOR' ? 'Tensor' : 
                       nftEvent.source || 'Unknown';
          buyer = nftEvent.buyer || newOwner;
          seller = nftEvent.seller || oldOwner;
          involvesOwnershipChange = true;
          
        } else if (nftEvent.type === 'NFT_LISTING') {
          transactionType = 'listing';
          price = nftEvent.amount ? nftEvent.amount / 1e9 : null;
          marketplace = nftEvent.source === 'MAGIC_EDEN' ? 'Magic Eden' : 
                       nftEvent.source === 'TENSOR' ? 'Tensor' : 
                       nftEvent.source || 'Unknown';
          seller = nftEvent.seller || oldOwner;
          involvesOwnershipChange = true;
          
        } else if (nftEvent.type === 'NFT_CANCEL_LISTING') {
          transactionType = 'delist';
          marketplace = nftEvent.source === 'MAGIC_EDEN' ? 'Magic Eden' : 
                       nftEvent.source === 'TENSOR' ? 'Tensor' : 
                       nftEvent.source || 'Unknown';
          seller = nftEvent.seller || oldOwner;
          involvesOwnershipChange = true;
        }
      }
      
      // Check for collection offers and other transaction types
      if (!involvesOwnershipChange && tx.description) {
        const description = tx.description.toLowerCase();
        console.log(`- Checking description: ${description}`);
        
        // Collection offer accepted
        if (description.includes('collection offer') || description.includes('bid accepted')) {
          transactionType = 'sale';
          // Try to extract price from description
          const priceMatch = tx.description.match(/(\d+\.?\d*)\s*sol/i);
          if (priceMatch) {
            price = parseFloat(priceMatch[1]);
          }
          marketplace = 'Collection Offer';
          buyer = newOwner;
          seller = oldOwner;
          involvesOwnershipChange = true;
          
        // Direct sale
        } else if (description.includes('sold') || description.includes('purchase')) {
          transactionType = 'sale';
          const priceMatch = tx.description.match(/(\d+\.?\d*)\s*sol/i);
          if (priceMatch) {
            price = parseFloat(priceMatch[1]);
          }
          marketplace = 'Direct Sale';
          buyer = newOwner;
          seller = oldOwner;
          involvesOwnershipChange = true;
          
        // Transfer
        } else if (description.includes('transfer') || description.includes('sent')) {
          transactionType = 'transfer';
          involvesOwnershipChange = true;
        }
      }
      
      // Check token transfers for price information
      if (involvesOwnershipChange && !price && tx.tokenTransfers) {
        const transfer = tx.tokenTransfers.find(t => t.mint === mintAddress);
        if (transfer && transfer.amount) {
          price = transfer.amount / 1e9;
          console.log(`- Found price from token transfer: ${price} SOL`);
        }
      }
      
      // If we found a relevant transaction, return the result
      if (involvesOwnershipChange) {
        console.log(`\n✅ Detected transaction type: ${transactionType}`);
        
        switch (transactionType) {
          case 'sale':
            return {
              type: 'sold',
              details: {
                marketplace: marketplace,
                seller: seller,
                buyer: buyer,
                price: price,
                timestamp: new Date().toISOString()
              }
            };
            
          case 'listing':
            return {
              type: 'listed',
              details: {
                marketplace: marketplace,
                lister: seller,
                price: price,
                timestamp: new Date().toISOString()
              }
            };
            
          case 'delist':
            return {
              type: 'delisted',
              details: {
                marketplace: marketplace,
                owner: seller,
                timestamp: new Date().toISOString()
              }
            };
            
          case 'transfer':
          default:
            return {
              type: 'transfer',
              details: {
                from: oldOwner,
                to: newOwner,
                timestamp: new Date().toISOString()
              }
            };
        }
      }
    }
    
    // If no specific transaction type was detected, check if it's a marketplace transfer
    const normalizedOldOwner = oldOwner.toLowerCase();
    const normalizedNewOwner = newOwner.toLowerCase();
    
    // Check if moving to/from marketplace escrows
    if (normalizedNewOwner === '1bwutmtvypwdtmw9abtk4ssr8no61spgavw1x6ndix' || 
        normalizedNewOwner === '4zdnggatfsw1cqghqkiwyrsxaagxrsrrnnuunxzjxue') {
      return {
        type: 'listed',
        details: {
          marketplace: normalizedNewOwner === '1bwutmtvypwdtmw9abtk4ssr8no61spgavw1x6ndix' ? 'Magic Eden' : 'Tensor',
          lister: oldOwner,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    if (normalizedOldOwner === '1bwutmtvypwdtmw9abtk4ssr8no61spgavw1x6ndix' || 
        normalizedOldOwner === '4zdnggatfsw1cqghqkiwyrsxaagxrsrrnnuunxzjxue') {
      return {
        type: 'delisted',
        details: {
          marketplace: normalizedOldOwner === '1bwutmtvypwdtmw9abtk4ssr8no61spgavw1x6ndix' ? 'Magic Eden' : 'Tensor',
          owner: newOwner,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Default to transfer if no specific type detected
    console.log(`\n⚠️ No specific transaction type detected - treating as transfer`);
    return {
      type: 'transfer',
      details: {
        from: oldOwner,
        to: newOwner,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error('Error determining ownership change:', error);
    return { type: 'unknown' };
  }
}

// Helper to get display name from user_roles
async function getDiscordNameForWallet(client, wallet) {
  if (!wallet) return null;
  
  // First get the discord_id from user_wallets
  const { rows: walletRows } = await client.query(
    'SELECT discord_id FROM user_wallets WHERE wallet_address = $1 LIMIT 1',
    [wallet]
  );
  
  if (walletRows.length === 0) return null;
  
  const discordId = walletRows[0].discord_id;
  
  // Then get the discord_name from user_roles
  const { rows: roleRows } = await client.query(
    'SELECT discord_name FROM user_roles WHERE discord_id = $1 LIMIT 1',
    [discordId]
  );
  
  return roleRows[0]?.discord_name || null;
}

// Function to handle ownership changes
async function handleOwnershipChange(client, nft, dbNFT, change) {
  console.log(`Processing ownership change for ${nft.id}:`);
  console.log(`- Change type: ${change.type}`);
  console.log(`- New owner: ${nft.ownership.owner}`);
  console.log(`- Old owner: ${dbNFT.owner_wallet}`);

  try {
    // Get Discord names for owners
    const newOwnerDiscord = await getDiscordNameForWallet(client, nft.ownership.owner);
    const oldOwnerDiscord = await getDiscordNameForWallet(client, dbNFT.owner_wallet);
    
    let listPrice = null;
    let listerDiscordName = null;
    let marketplace = null;

    // If this is a listing event, fetch transaction history to get price
    if (change.type === 'listed') {
      console.log(`\nFetching transaction history for ${nft.id} to get list price...`);
      
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${nft.id}/transactions?api-key=${process.env.HELIUS_API_KEY}`
      );
      
      if (!response.ok) {
        console.error(`Failed to fetch transaction history: ${response.statusText}`);
        throw new Error(`Failed to fetch transaction history: ${response.statusText}`);
      }
      
      const transactions = await response.json();
      console.log(`Found ${transactions.length} transactions`);
      
      // Find the most recent listing transaction
      const listingTx = transactions.find(tx => {
        return tx.type === 'NFT_LISTING' || 
               (tx.events?.nft?.type === 'NFT_LISTING');
      });
      
      if (listingTx) {
        console.log('Found listing transaction:', listingTx);
        
        // Try to get price from events first
        if (listingTx.events?.nft) {
          const event = listingTx.events.nft;
          if (event.amount) {
            listPrice = event.amount / 1e9; // Convert lamports to SOL
            marketplace = event.source === 'MAGIC_EDEN' ? 'Magic Eden' : 
                         event.source === 'TENSOR' ? 'Tensor' : 
                         event.source || 'Unknown';
            listerDiscordName = await getDiscordNameForWallet(client, event.seller || listingTx.feePayer);
            console.log('Found list price from events:', listPrice, 'SOL');
          }
        }
        
        // If no price in events, try to get from transaction description
        if (!listPrice && listingTx.description) {
          const priceMatch = listingTx.description.match(/(\d+\.?\d*)\s*SOL/);
          if (priceMatch) {
            listPrice = parseFloat(priceMatch[1]);
            marketplace = listingTx.source || 'Unknown';
            listerDiscordName = await getDiscordNameForWallet(client, listingTx.feePayer);
            console.log('Found list price from description:', listPrice, 'SOL');
          }
        }

        // For Tensor listings, try to decode the program data
        if (!listPrice && marketplace === 'TENSOR' && listingTx.events) {
          const tensorEvent = listingTx.events.find(event => 
            event.programId === 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN'
          );
          
          if (tensorEvent && tensorEvent.data) {
            try {
              // Decode base64 data
              const decodedData = Buffer.from(tensorEvent.data, 'base64');
              // Price is in bytes 16-23
              const priceBytes = decodedData.slice(16, 24);
              const priceLamports = priceBytes.readBigUInt64LE();
              listPrice = Number(priceLamports) / 1e9;
              marketplace = 'Tensor';
              listerDiscordName = await getDiscordNameForWallet(client, listingTx.feePayer);
              console.log('Found list price from Tensor data:', listPrice, 'SOL');
            } catch (error) {
              console.error('Error decoding Tensor listing data:', error);
            }
          }
        }

        // Update database with listing information
        if (listPrice && listPrice > 0) {
          await client.query(
            `UPDATE nft_metadata 
             SET owner_wallet = $1,
                 is_listed = true,
                 list_price = $2,
                 marketplace = $3,
                 original_lister = $4,
                 lister_discord_name = $5
             WHERE mint_address = $6`,
            [
              nft.ownership.owner, // escrow wallet
              listPrice,
              marketplace,
              dbNFT.owner_wallet, // original owner
              listerDiscordName,
              nft.id
            ]
          );
        }
      }
    } else if (change.type === 'sold') {
      // Fetch transaction history to get sale price and details
      console.log(`\nFetching transaction history for ${nft.id} to get sale price...`);
      const response = await fetch(
        `https://api.helius.xyz/v0/addresses/${nft.id}/transactions?api-key=${process.env.HELIUS_API_KEY}`
      );
      if (!response.ok) {
        console.error(`Failed to fetch transaction history: ${response.statusText}`);
        throw new Error(`Failed to fetch transaction history: ${response.statusText}`);
      }
      const transactions = await response.json();
      console.log(`Found ${transactions.length} transactions`);
      // Find the most recent sale transaction
      const saleTx = transactions.find(tx => tx.type === 'NFT_SALE' || (tx.events?.nft?.type === 'NFT_SALE'));
      let salePrice = null;
      let marketplace = null;
      let buyer = null;
      let seller = null;
      if (saleTx) {
        console.log('Found sale transaction:', saleTx);
        if (saleTx.events?.nft) {
          const event = saleTx.events.nft;
          salePrice = event.amount / 1e9;
          marketplace = event.source || 'Magic Eden';
          buyer = event.buyer;
          seller = event.seller;
        } else if (saleTx.description) {
          const priceMatch = saleTx.description.match(/(\d+\.?\d*)\s*SOL/);
          if (priceMatch) {
            salePrice = parseFloat(priceMatch[1]);
          }
          marketplace = saleTx.source || 'Magic Eden';
        }
      }
      // Update DB: set owner_wallet to buyer, is_listed to false, clear list_price, marketplace, original_lister, lister_discord_name, set last_sale_price
      await client.query(
        `UPDATE nft_metadata 
         SET owner_wallet = $1,
             is_listed = false,
             list_price = NULL,
             marketplace = NULL,
             original_lister = NULL,
             lister_discord_name = NULL,
             last_sale_price = $2
         WHERE mint_address = $3`,
        [buyer || nft.ownership.owner, salePrice, nft.id]
      );
      // Fetch the latest NFT row from the database
      const { rows: [updatedNFT] } = await client.query(
        'SELECT * FROM nft_metadata WHERE mint_address = $1',
        [nft.id]
      );
      // Fetch Discord names for buyer and seller
      const buyerDiscord = await getDiscordNameForWallet(client, buyer);
      const sellerDiscord = await getDiscordNameForWallet(client, seller);
      // Prepare and send the embed
      const message = formatDiscordMessage({
        type: change.type,
        nft: {
          ...updatedNFT,
          name: updatedNFT.name,
          salePrice: salePrice,
          marketplace: marketplace,
          owner_discord_id: buyerDiscord,
          previous_owner_wallet: seller,
          previous_owner_discord: sellerDiscord
        }
      });
      await sendActivityNotification(message);
      return;
    } else if (change.type === 'delisted') {
      await client.query(
        `UPDATE nft_metadata 
        SET is_listed = false, 
            list_price = NULL, 
            lister_discord_name = NULL,
            marketplace = NULL,
            owner_wallet = $1,
            original_lister = NULL
        WHERE mint_address = $2`,
        [nft.ownership.owner, nft.id]
      );
    } else if (change.type === 'transferred' || change.type === 'transfer') {
      await client.query(
        `UPDATE nft_metadata 
        SET owner_wallet = $1,
            owner_discord_id = $2
        WHERE mint_address = $3`,
        [nft.ownership.owner, newOwnerDiscord, nft.id]
      );
    } else if (change.type === 'burned') {
      // Handle burn event
      console.log(`\n🔥 NFT Burned: ${nft.id}`);
      
      // Get Discord name for the previous owner
      const previousOwnerDiscord = await getDiscordNameForWallet(client, dbNFT.owner_wallet);
      
      // Format and send burn notification
      const message = formatDiscordMessage({
        type: 'burned',
        nft: {
          mint_address: nft.id,
          name: nft.content.metadata.name,
          symbol: COLLECTION.name,
          owner_wallet: dbNFT.owner_wallet,
          original_lister: dbNFT.original_lister,
          rarity_rank: dbNFT.rarity_rank,
          image_url: nft.content.links.image,
          owner_discord_id: previousOwnerDiscord
        }
      });
      
      await sendActivityNotification(message);
      
      // Delete the NFT from database since it's burned
      await client.query(
        `DELETE FROM nft_metadata WHERE mint_address = $1`,
        [nft.id]
      );
      
      return; // Exit early since NFT is deleted
    }

    // Fetch the latest NFT row from the database
    const { rows: [updatedNFT] } = await client.query(
      'SELECT * FROM nft_metadata WHERE mint_address = $1',
      [nft.id]
    );

    // Fetch Discord names for all relevant wallets
    const latestOwnerDiscord = await getDiscordNameForWallet(client, updatedNFT.owner_wallet);
    const previousOwnerDiscord = await getDiscordNameForWallet(client, dbNFT.owner_wallet);

    // Prepare the message for Discord
    let message;
    if (change.type === 'listed') {
      message = formatDiscordMessage({
        type: change.type,
        nft: {
          ...updatedNFT,
          name: updatedNFT.name,
          original_lister: dbNFT.owner_wallet,
          lister_discord_name: previousOwnerDiscord,
          listPrice: listPrice,
          marketplace: updatedNFT.marketplace,
        }
      });
    } else if (change.type === 'delisted') {
      message = formatDiscordMessage({
        type: change.type,
        nft: {
          ...updatedNFT,
          name: updatedNFT.name,
          owner_discord_id: latestOwnerDiscord,
        }
      });
    } else if (change.type === 'transferred' || change.type === 'transfer') {
      message = formatDiscordMessage({
        type: change.type,
        nft: {
          ...updatedNFT,
          name: updatedNFT.name,
          previous_owner_wallet: dbNFT.owner_wallet,
          previous_owner_discord: previousOwnerDiscord,
          owner_discord_id: latestOwnerDiscord,
        }
      });
    } else if (change.type === 'sold') {
      message = formatDiscordMessage({
        type: change.type,
        nft: {
          ...updatedNFT,
          name: updatedNFT.name,
          salePrice: salePrice,
          marketplace: marketplace,
          owner_discord_id: latestOwnerDiscord,
        }
      });
    } else {
      message = formatDiscordMessage({
        type: change.type,
        nft: {
          ...updatedNFT,
          name: updatedNFT.name,
        }
      });
    }
    await sendActivityNotification(message);

  } catch (error) {
    console.error('Error handling ownership change:', error);
  }
}

// Add the event-specific embed formatter here:
function formatDiscordMessage(data) {
  const { type, nft } = data;

  const getCollectionLogo = (symbol) => {
    const logos = {
      'FCKEDCATZ': '/logos/cat.PNG',
      'CelebCatz': '/logos/celeb.PNG',
      'MM': '/logos/monster.PNG',
      'MM3D': '/logos/monster.PNG',
      'AIBB': '/logos/bot.PNG'
    };
    return `https://buxdao.com${logos[symbol] || '/logos/default.PNG'}`;
  };

  const getDisplayName = (wallet, discordName) => {
    if (!wallet) return 'Unknown';
    return discordName || `\`${wallet.slice(0, 4)}...${wallet.slice(-4)}\``;
  };

  const getMarketplaceLinks = (mint) =>
    `[View on Magic Eden](https://magiceden.io/item-details/${mint}) • [View on Tensor](https://www.tensor.trade/item/${mint})`;

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    
    // If it's a local PNG path (starts with /)
    if (imageUrl.startsWith('/')) {
      return `https://buxdao.com${imageUrl}`;
    }
    
    // If it's already a full URL
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a relative path without leading slash
    return `https://buxdao.com/${imageUrl}`;
  };

  const fields = [];
  let title = '';
  let description = '';
  let color = 0x000000;

  switch (type) {
    case 'listed':
      title = `📝 LISTED - ${nft.name || nft.name || 'Unknown NFT'}`;
      color = 0x4CAF50;
      fields.push(
        { name: ' Price', value: `${Number(data.listPrice ?? nft.list_price ?? 0).toFixed(2)} SOL`, inline: false },
        { name: ' Owner', value: getDisplayName(nft.original_lister, nft.lister_discord_name), inline: false },
        { name: ' Marketplace', value: data.marketplace || nft.marketplace || 'Unknown', inline: false }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: false });
      }
      break;
    case 'sold':
      title = `💰 SOLD - ${nft.name || 'Unknown NFT'}`;
      color = 0xF44336;
      fields.push(
        { name: '💰 Price', value: `${Number(data.salePrice ?? nft.last_sale_price ?? 0).toFixed(2)} SOL`, inline: false },
        { name: '👤 New Owner', value: getDisplayName(nft.owner_wallet, nft.owner_discord_id), inline: false },
        { name: '🏪 Marketplace', value: data.marketplace || nft.marketplace || 'Unknown', inline: false }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: false });
      }
      break;
    case 'delisted':
      title = `❌ DELISTED - ${nft.name || 'Unknown NFT'}`;
      color = 0xFF9800;
      fields.push(
        { name: '👤 Owner', value: getDisplayName(nft.owner_wallet, nft.owner_discord_id), inline: false }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: false });
      }
      break;
    case 'transfer':
      title = `♻️ TRANSFER - ${nft.name || 'Unknown NFT'}`;
      color = 0x2196F3;
      fields.push(
        { name: '👤 From', value: getDisplayName(nft.previous_owner_wallet, nft.previous_owner_discord), inline: false },
        { name: '👤 To', value: getDisplayName(nft.owner_wallet, nft.owner_discord_id), inline: false }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: false });
      }
      break;
    case 'burned':
      title = `🔥 BURNED - ${nft.name || 'Unknown NFT'}`;
      color = 0x9E9E9E;
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: false });
      }
      break;
    default:
      throw new Error(`Unknown event type for embed: ${type}`);
  }

  description = getMarketplaceLinks(nft.mint_address);

  const embed = {
    title: title,
    description: description,
    color: color,
    fields: fields,
    thumbnail: {
      url: getCollectionLogo(nft.symbol)
    },
    footer: {
      text: 'BUXDAO • Putting Community First'
    },
    timestamp: new Date().toISOString()
  };

  embed.image = { url: getImageUrl(nft.image_url) };

  if (!title) {
    throw new Error(`Unknown event type for embed: ${type}`);
  }

  return { embeds: [embed] };
}

// Main sync function
async function syncCelebCatz() {
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
  
  try {
    console.log('\nStarting CELEBCATZ NFT ownership sync...');
    
    // Fetch all NFTs in the collection
    console.log(`Fetching NFTs for ${COLLECTION.name}...`);
    const collectionNFTs = await fetchCollectionNFTs(connection);
    console.log(`Found ${collectionNFTs.length} NFTs in ${COLLECTION.name}`);
    
    if (collectionNFTs.length === 0) {
      console.log(`No NFTs found for ${COLLECTION.name} - exiting`);
      return;
    }
    
    // Update summary with NFTs found
    summary.nftsFound = collectionNFTs.length;
    
    // Get current database state for this collection
    console.log(`Fetching database state for ${COLLECTION.name}...`);
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
      [COLLECTION.name]
    );
    
    // Update summary with DB counts
    summary.nftsInDB = dbNFTs.length;
    
    console.log(`\nDatabase state for ${COLLECTION.name}:`);
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
        summary.newNFTs++;
        if (TEST_MODE) {
          console.log(`\nTest Mode: New NFT Found:`, {
            mint: nft.id,
            name: nft.content.metadata.name,
            owner: nft.ownership.owner,
            collection: COLLECTION.name
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
              COLLECTION.name,
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
      
      // Check for ownership changes - use improved transaction analysis for ALL changes
      if (dbNFT.owner_wallet !== nft.ownership.owner) {
        console.log(`\n🔍 Ownership change detected for ${nft.id}:`);
        console.log(`- Previous owner: ${dbNFT.owner_wallet}`);
        console.log(`- New owner: ${nft.ownership.owner}`);
        
        // Use the improved determineOwnershipChange function for ALL ownership changes
        const change = await determineOwnershipChange(
          nft.id,
          dbNFT.owner_wallet,
          nft.ownership.owner
        );
        
        // Update summary with ownership changes
        if (summary.ownershipChanges[change.type] !== undefined) {
          summary.ownershipChanges[change.type]++;
        } else {
          console.log(`⚠️ Unknown change type: ${change.type}`);
        }
        
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
          collection: COLLECTION.name
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
            collection: COLLECTION.name
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
              
              // Get Discord name for the previous owner
              const previousOwnerDiscord = await getDiscordNameForWallet(client, dbNFT.owner_wallet);
              
              // Format the burn notification properly
              const message = formatDiscordMessage({
                type: 'burned',
                nft: {
                  mint_address: dbNFT.mint_address,
                  name: dbNFT.name,
                  symbol: dbNFT.symbol,
                  owner_wallet: dbNFT.owner_wallet,
                  original_lister: dbNFT.original_lister,
                  rarity_rank: dbNFT.rarity_rank,
                  image_url: dbNFT.image_url,
                  owner_discord_id: previousOwnerDiscord
                }
              });
              
              await sendActivityNotification(message);
              
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
    
    // Display summary
    console.log('\n=== SYNC SUMMARY ===');
    console.log(`Collection: ${COLLECTION.name}`);
    console.log(`Total NFTs Found: ${summary.nftsFound}`);
    console.log(`Total NFTs in Database: ${summary.nftsInDB}`);
    console.log(`New NFTs Found: ${summary.newNFTs}`);
    console.log('\nOwnership Changes:');
    console.log(`- Transfers: ${summary.ownershipChanges.transfers}`);
    console.log(`- Sales: ${summary.ownershipChanges.sales}`);
    console.log(`- Listings: ${summary.ownershipChanges.listings}`);
    console.log(`- Delists: ${summary.ownershipChanges.delists}`);
    console.log(`- Burns: ${summary.ownershipChanges.burns}`);
    
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

// Run the sync if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncCelebCatz()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export default syncCelebCatz;