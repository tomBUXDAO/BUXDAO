// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { Connection, PublicKey } from '@solana/web3.js';
import { pool } from './api/config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
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

  const getDisplayName = (wallet, discordName, originalLister, listerDiscordName) => {
    if (!wallet) return 'Unknown';
    // For listings, use original_lister and lister_discord_name
    if (originalLister) {
      return listerDiscordName || `\`${originalLister.slice(0, 4)}...${originalLister.slice(-4)}\``;
    }
    // For other cases, use the provided wallet and discord name
    return discordName || `\`${wallet.slice(0, 4)}...${wallet.slice(-4)}\``;
  };

  const getMarketplaceLinks = (mint) => 
    `[View on Magic Eden](https://magiceden.io/item-details/${mint}) • [View on Tensor](https://www.tensor.trade/item/${mint})`;

  const getImageUrl = (imageUrl, symbol, name) => {
    // If it's a URL, use it directly
    if (imageUrl?.startsWith('http')) {
      return imageUrl;
    }
    
    // If it's a local file path or doesn't exist, construct URL based on collection and name
    const collection = symbol === 'AIBB' ? 'bitbots' : 
                      symbol === 'FCKEDCATZ' ? 'cats' :
                      symbol === 'CelebCatz' ? 'celebs' :
                      symbol === 'MM' ? 'monsters' :
                      symbol === 'MM3D' ? 'monsters3d' : 'default';
                      
    // Extract number from name (e.g. "AI Bitbot #141" -> "141")
    const number = name.match(/\d+/)?.[0] || '0';
    // Pad with zeros to 4 digits
    const paddedNumber = number.padStart(4, '0');
    
    return `https://buxdao.com/images/${collection}/${paddedNumber}.png`;
  };

  const fields = [];
  let title = '';
  let description = '';
  let color = 0x000000;

  switch (type) {
    case 'listing':
      title = `📝 LISTED - ${nft.name}`;
      color = 0x4CAF50;
      fields.push(
        { name: '💰 Price', value: `${data.listPrice} SOL`, inline: true },
        { name: '👤 Owner', value: getDisplayName(nft.original_lister, nft.lister_discord_name, nft.original_lister, nft.lister_discord_name), inline: true },
        { name: '🏪 Marketplace', value: data.marketplace, inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'sale':
      title = `💰 SOLD - ${nft.name}`;
      color = 0xF44336;
      fields.push(
        { name: '💰 Price', value: `${data.salePrice} SOL`, inline: true },
        { name: '👤 New Owner', value: getDisplayName(data.newOwner, nft.owner_name, nft.original_lister, nft.lister_discord_name), inline: true },
        { name: '🏪 Marketplace', value: data.marketplace || 'Unknown', inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'delist':
      title = `🔄 DELISTED - ${nft.name}`;
      color = 0xFF9800;
      fields.push(
        { name: '👤 Owner', value: getDisplayName(data.newOwner, nft.owner_name, nft.original_lister, nft.lister_discord_name), inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'transfer':
      title = `📤 TRANSFER - ${nft.name}`;
      color = 0x2196F3;
      fields.push(
        { name: '👤 New Owner', value: getDisplayName(data.newOwner, nft.owner_name, nft.original_lister, nft.lister_discord_name), inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'burned':
      title = `🔥 BURNED - ${nft.name}`;
      color = 0x9E9E9E;
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;
  }

  description = getMarketplaceLinks(nft.mint_address);

  // Ensure all required fields are present and properly formatted
  const embed = {
    title: title || 'NFT Activity',
    description: description || 'No description available',
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

  // Add image using our new getImageUrl function
  embed.image = { url: getImageUrl(nft.image_url, nft.symbol, nft.name) };

  return {
    embeds: [embed]
  };
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
  const isCurrentEscrow = ESCROW_WALLETS.has(currentOwner);
  const wasEscrow = ESCROW_WALLETS.has(previousOwner);

  // Case 1: Burned (no token accounts)
  if (!currentOwner) {
    return { type: 'burned', details: null };
  }

  // Case 2: Transfer between non-escrow wallets
  if (!isCurrentEscrow && !wasEscrow) {
    return { 
      type: 'transfer', 
      details: { newOwner: currentOwner }
    };
  }

  // Case 3: Delist (was escrow, now back to original lister)
  if (wasEscrow && currentOwner === originalLister) {
    return { 
      type: 'delist', 
      details: { newOwner: currentOwner }
    };
  }

  // Case 4: Sale (was escrow, now different non-original owner)
  if (wasEscrow && currentOwner !== originalLister) {
    // Fetch transaction to get sale price
    const prices = await extractPricesFromTransaction(connection, tokenAccount);
    if (!prices?.salePrice) {
      return { 
        type: 'manual_review', 
        details: { 
          reason: 'Could not determine sale price',
          currentOwner,
          previousOwner,
          originalLister
        }
      };
    }

    return { 
      type: 'sale', 
      details: { 
        newOwner: currentOwner,
        marketplace: getMarketplaceName(previousOwner),
        salePrice: prices.salePrice
      }
    };
  }

  // Case 5: New listing (now escrow, wasn't before)
  if (isCurrentEscrow && !wasEscrow) {
    // Fetch transaction to get list price
    const prices = await extractPricesFromTransaction(connection, tokenAccount);
    if (!prices?.listPrice) {
      return { 
        type: 'manual_review', 
        details: { 
          reason: 'Could not determine list price',
          currentOwner,
          previousOwner,
          originalLister
        }
      };
    }

    return { 
      type: 'listing', 
      details: { 
        marketplace: getMarketplaceName(currentOwner),
        originalOwner: previousOwner,
        listPrice: prices.listPrice
      }
    };
  }

  // Default case: Unknown change
  return { 
    type: 'manual_review', 
    details: { 
      reason: 'Unknown ownership change type',
      currentOwner,
      previousOwner,
      originalLister
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

// Process NFTs in batches
async function processBatch(connection, client, nfts, startIndex) {
  const batchNFTs = nfts.slice(startIndex, startIndex + BATCH_SIZE);
  const batchPromises = [];

  console.log(`\nProcessing batch ${Math.floor(startIndex/BATCH_SIZE) + 1}/${Math.ceil(nfts.length/BATCH_SIZE)}`);
  console.log(`NFTs ${startIndex + 1} to ${Math.min(startIndex + BATCH_SIZE, nfts.length)} of ${nfts.length}`);

  // Prepare all token account queries
  const tokenAccountPromises = batchNFTs.map(nft => {
    const mint = new PublicKey(nft.mint_address);
    return connection.getTokenLargestAccounts(mint);
  });

  // Wait for rate limit before making batch request
  await rateLimit();

  // Execute batch request
  try {
    const tokenAccounts = await Promise.all(tokenAccountPromises);
    
    // Process each NFT in the batch
    for (let i = 0; i < batchNFTs.length; i++) {
      const nft = batchNFTs[i];
      const accounts = tokenAccounts[i];

      console.log(`\nProcessing NFT: ${nft.name}`);
      console.log(`Mint: ${nft.mint_address}`);

      try {
        if (!accounts?.value?.length) {
          console.log('🔥 NFT appears to be burned');
          
          const notificationSuccess = await sendDiscordNotification({
            type: 'burned',
            nft
          });

          if (!notificationSuccess) {
            throw new Error('Failed to send burn notification');
          }

          await withRetry(async () => {
            await client.query('DELETE FROM nft_metadata WHERE mint_address = $1', [nft.mint_address]);
          });
          console.log('✓ Successfully processed burn');
          continue;
        }

        const tokenAccount = accounts.value[0];
        console.log(`Token account: ${tokenAccount.address.toString()}`);

        // Get current owner
        const accountInfo = await connection.getAccountInfo(tokenAccount.address);
        if (!accountInfo?.data?.length) {
          throw new Error('Invalid token account data');
        }

        const tokenData = parseTokenAccountData(accountInfo.data);
        const currentOwner = tokenData?.owner;
        if (!currentOwner) {
          throw new Error('Could not parse owner from token data');
        }

        console.log(`Current on-chain owner: ${currentOwner}`);
        console.log(`Database owner: ${nft.owner_wallet}`);

        if (currentOwner !== nft.owner_wallet) {
          const change = await determineOwnershipChange(
            connection,
            tokenAccount.address,
            currentOwner,
            nft.owner_wallet,
            nft.original_lister
          );

          console.log(`Detected ownership change type: ${change.type}`);

          // Handle based on change type
          switch (change.type) {
            case 'transfer':
              // Send notification and update database
              const transferSuccess = await sendDiscordNotification({
                type: 'transfer',
                nft: {
                  ...nft,
                  owner_wallet: currentOwner
                },
                newOwner: currentOwner
              });

              if (!transferSuccess) {
                throw new Error('Failed to send transfer notification');
              }

              await withRetry(async () => {
                await client.query(`
                  UPDATE nft_metadata 
                  SET owner_wallet = $1
                  WHERE mint_address = $2`,
                  [currentOwner, nft.mint_address]
                );
              });
              console.log('✓ Successfully processed transfer');
              break;

            case 'delist':
              // Send notification and update database
              const delistSuccess = await sendDiscordNotification({
                type: 'delist',
                nft: {
                  ...nft,
                  owner_wallet: currentOwner
                },
                newOwner: currentOwner
              });

              if (!delistSuccess) {
                throw new Error('Failed to send delist notification');
              }

              await withRetry(async () => {
                await client.query(`
                  UPDATE nft_metadata 
                  SET owner_wallet = $1,
                      is_listed = false,
                      marketplace = NULL,
                      list_price = NULL,
                      original_lister = NULL
                  WHERE mint_address = $2`,
                  [currentOwner, nft.mint_address]
                );
              });
              console.log('✓ Successfully processed delist');
              break;

            case 'sale':
              // Send notification and update database
              const saleSuccess = await sendDiscordNotification({
                type: 'sale',
                nft: {
                  ...nft,
                  owner_wallet: currentOwner
                },
                salePrice: change.details.salePrice,
                marketplace: change.details.marketplace,
                newOwner: currentOwner
              });

              if (!saleSuccess) {
                throw new Error('Failed to send sale notification');
              }

              await withRetry(async () => {
                await client.query(`
                  UPDATE nft_metadata 
                  SET owner_wallet = $1,
                      is_listed = false,
                      marketplace = NULL,
                      list_price = NULL,
                      last_sale_price = $2,
                      original_lister = NULL
                  WHERE mint_address = $3`,
                  [currentOwner, change.details.salePrice, nft.mint_address]
                );
              });
              console.log('✓ Successfully processed sale');
              break;

            case 'listing':
              // Send notification and update database
              const listingSuccess = await sendDiscordNotification({
                type: 'listing',
                nft,
                marketplace: change.details.marketplace,
                listPrice: change.details.listPrice,
                originalOwner: change.details.originalOwner
              });

              if (!listingSuccess) {
                throw new Error('Failed to send listing notification');
              }

              await withRetry(async () => {
                await client.query(
                  `UPDATE nft_metadata 
                  SET owner_wallet = $1,
                      is_listed = true,
                      marketplace = $2,
                      list_price = $3,
                      original_lister = $4
                  WHERE mint_address = $5`,
                  [currentOwner, change.details.marketplace, change.details.listPrice, nft.owner_wallet, nft.mint_address]
                );
              });
              console.log('✓ Successfully processed listing');
              break;

            case 'manual_review':
              // Treat manual review as a transfer
              await withRetry(async () => {
                await client.query(
                  `UPDATE nft_metadata 
                  SET owner_wallet = $1
                  WHERE mint_address = $2`,
                  [currentOwner, nft.mint_address]
                );
              });
              console.log('✓ Successfully processed manual review as transfer');
              break;

            default:
              throw new Error(`Unexpected change type: ${change.type}`);
          }
        } else {
          console.log('✓ No change in ownership');
        }
      } catch (error) {
        console.error(`❌ Error processing NFT ${nft.mint_address}:`, error);
        // Continue with next NFT instead of stopping the entire script
        continue;
      }
    }
  } catch (error) {
    console.error('Batch processing error:', error);
    // Retry the batch with smaller size if it fails
    if (BATCH_SIZE > 5) {
      console.log('Retrying with smaller batch size...');
      const smallerBatchSize = Math.floor(BATCH_SIZE / 2);
      for (let i = 0; i < BATCH_SIZE; i += smallerBatchSize) {
        await processBatch(connection, client, batchNFTs, i);
      }
    } else {
      throw error;
    }
  }
}

async function syncNFTOwnership() {
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
  
  try {
    console.log('\nFetching NFTs from database...');
    const { rows: nfts } = await withRetry(async () => {
      return await client.query(`
        SELECT 
          mint_address, 
          name,
          symbol,
          owner_wallet,
          original_lister,
          is_listed,
          marketplace,
          list_price,
          rarity_rank,
          image_url,
          owner_discord_id,
          owner_name,
          lister_discord_name
        FROM nft_metadata
        ORDER BY symbol, name
      `);
    });

    console.log(`\nFound ${nfts.length} NFTs to check`);
    
    // Process NFTs in batches
    for (let i = 0; i < nfts.length; i += BATCH_SIZE) {
      await processBatch(connection, client, nfts, i);
    }

    console.log('\n=== Script completed successfully ===');

  } catch (error) {
    console.error('Fatal error in syncNFTOwnership:', error);
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
export { sendDiscordNotification };
export default syncNFTOwnership;