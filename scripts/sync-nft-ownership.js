import { Connection, PublicKey } from '@solana/web3.js';
import { pool } from '../api/config/database.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

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

// Rate limiting helper
async function rateLimit() {
  await new Promise(resolve => setTimeout(resolve, 100)); // 10 requests per second max
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

  const getDisplayName = (wallet, discordName) => {
    if (!wallet) return 'Unknown';
    return discordName || `\`${wallet.slice(0, 4)}...${wallet.slice(-4)}\``;
  };

  const getMarketplaceLinks = (mint) => 
    `[View on Magic Eden](https://magiceden.io/item-details/${mint}) • [View on Tensor](https://www.tensor.trade/item/${mint})`;

  const fields = [];
  let title = '';
  let description = '';
  let color = 0x000000;

  switch (type) {
    case 'listing':
      title = `📝 LISTED - ${nft.name}`;
      color = 0x4CAF50; // Green
      fields.push(
        { name: '💰 Price', value: `${data.listPrice} SOL`, inline: true },
        { name: '👤 Owner', value: getDisplayName(nft.original_lister, nft.lister_discord_name), inline: true },
        { name: '🏪 Marketplace', value: data.marketplace, inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'sale':
      title = `💰 SOLD - ${nft.name}`;
      color = 0xF44336; // Red
      fields.push(
        { name: '💰 Price', value: `${data.salePrice} SOL`, inline: true },
        { name: '👤 New Owner', value: getDisplayName(data.newOwner, nft.owner_name), inline: true },
        { name: '🏪 Marketplace', value: data.marketplace || 'Unknown', inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'delist':
      title = `🔄 DELISTED - ${nft.name}`;
      color = 0xFF9800; // Orange
      fields.push(
        { name: '👤 Owner', value: getDisplayName(data.newOwner, nft.owner_name), inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'transfer':
      title = `📤 TRANSFER - ${nft.name}`;
      color = 0x2196F3; // Blue
      fields.push(
        { name: '👤 New Owner', value: getDisplayName(data.newOwner, nft.owner_name), inline: true }
      );
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;

    case 'burned':
      title = `🔥 BURNED - ${nft.name}`;
      color = 0x9E9E9E; // Gray
      if (nft.rarity_rank) {
        fields.push({ name: '✨ Rank', value: `#${nft.rarity_rank}`, inline: true });
      }
      break;
  }

  description = getMarketplaceLinks(nft.mint_address);

  return {
    content: '',
    embeds: [{
      title,
      description,
      color,
      fields,
      thumbnail: {
        url: getCollectionLogo(nft.symbol)
      },
      image: nft.image_url ? {
        url: nft.image_url
      } : null,
      footer: {
        text: 'BUXDAO • Putting Community First'
      },
      timestamp: new Date().toISOString()
    }]
  };
}

// Send Discord notification
async function sendDiscordNotification(data) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('Discord webhook URL not configured');
      return;
    }

    const message = formatDiscordMessage(data);
    await axios.post(webhookUrl, message);
  } catch (error) {
    console.error('Error sending Discord notification:', error);
  }
}

async function syncNFTOwnership() {
  const connection = new Connection(process.env.QUICKNODE_RPC_URL, 'confirmed');
  const client = await pool.connect();
  
  try {
    console.log('\nFetching NFTs from database...');
    // Get all NFTs from database
    const { rows: nfts } = await client.query(`
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

    console.log(`\nFound ${nfts.length} NFTs to check`);
    
    // Tracking arrays for different scenarios
    const manualReview = [];
    const processed = [];
    const errors = [];

    for (let i = 0; i < nfts.length; i++) {
      const nft = nfts[i];
      console.log(`\nProcessing NFT ${i + 1}/${nfts.length} (${((i + 1) / nfts.length * 100).toFixed(1)}%)`);
      console.log(`Name: ${nft.name}`);
      console.log(`Mint: ${nft.mint_address}`);
      
      try {
        await rateLimit();
        
        // Get current token account
        const mint = new PublicKey(nft.mint_address);
        const tokenAccounts = await connection.getTokenLargestAccounts(mint);
        
        // Check if NFT is burned
        if (!tokenAccounts?.value?.length) {
          console.log('🔥 NFT appears to be burned');
          
          await sendDiscordNotification({
            type: 'burned',
            nft
          });

          await client.query('DELETE FROM nft_metadata WHERE mint_address = $1', [nft.mint_address]);
          processed.push({ mint: nft.mint_address, action: 'burned' });
          continue;
        }
        
        const tokenAccount = tokenAccounts.value[0];
        console.log(`Token account: ${tokenAccount.address.toString()}`);

        // Get current owner
        const accountInfo = await connection.getAccountInfo(tokenAccount.address);
        if (!accountInfo?.data?.length) {
          console.log('❌ Invalid token account data');
          errors.push({ mint: nft.mint_address, error: 'Invalid token account data' });
          continue;
        }

        const tokenData = parseTokenAccountData(accountInfo.data);
        const currentOwner = tokenData?.owner;
        if (!currentOwner) {
          console.log('❌ Could not parse owner from token data');
          errors.push({ mint: nft.mint_address, error: 'Could not parse owner' });
          continue;
        }

        console.log(`Current on-chain owner: ${currentOwner}`);
        console.log(`Database owner: ${nft.owner_wallet}`);

        // Case 1: No change in ownership
        if (currentOwner === nft.owner_wallet) {
          console.log('✓ No change in ownership');
          processed.push({ mint: nft.mint_address, action: 'unchanged' });
          continue;
        }

        const isCurrentEscrow = ESCROW_WALLETS.has(currentOwner);
        const wasEscrow = ESCROW_WALLETS.has(nft.owner_wallet);

        // Case 2: Transfer between non-escrow wallets
        if (!isCurrentEscrow && !wasEscrow) {
          console.log('📤 NFT transferred between non-escrow wallets');
          
          await client.query(`
            UPDATE nft_metadata 
            SET owner_wallet = $1
            WHERE mint_address = $2`,
            [currentOwner, nft.mint_address]
          );

          await sendDiscordNotification({
            type: 'transfer',
            nft: {
              ...nft,
              owner_wallet: currentOwner
            },
            newOwner: currentOwner
          });

          processed.push({ mint: nft.mint_address, action: 'transfer' });
          continue;
        }

        // Case 3: Delist (was escrow, now back to original lister)
        if (wasEscrow && currentOwner === nft.original_lister) {
          console.log('🔄 NFT delisted');
          
          await client.query(`
            UPDATE nft_metadata 
            SET owner_wallet = $1,
                is_listed = false,
                marketplace = NULL,
                list_price = NULL,
                original_lister = NULL,
                lister_discord_name = NULL
            WHERE mint_address = $2`,
            [currentOwner, nft.mint_address]
          );

          await sendDiscordNotification({
            type: 'delist',
            nft: {
              ...nft,
              owner_wallet: currentOwner
            },
            newOwner: currentOwner
          });

          processed.push({ mint: nft.mint_address, action: 'delist' });
          continue;
        }

        // Case 4: Sale (was escrow, now different non-original owner)
        if (wasEscrow && currentOwner !== nft.original_lister) {
          console.log('💰 Potential sale, checking price...');
          
          const prices = await extractPricesFromTransaction(connection, tokenAccount.address);
          if (!prices?.salePrice) {
            console.log('⚠️ Could not determine sale price, logging for manual review');
            manualReview.push({ 
              mint: nft.mint_address, 
              reason: 'Could not determine sale price',
              currentOwner,
              previousOwner: nft.owner_wallet
            });
            continue;
          }

          await client.query(`
            UPDATE nft_metadata 
            SET owner_wallet = $1,
                is_listed = false,
                marketplace = NULL,
                list_price = NULL,
                last_sale_price = $2,
                original_lister = NULL,
                lister_discord_name = NULL
            WHERE mint_address = $3`,
            [currentOwner, prices.salePrice, nft.mint_address]
          );

          await sendDiscordNotification({
            type: 'sale',
            nft: {
              ...nft,
              owner_wallet: currentOwner
            },
            salePrice: prices.salePrice,
            marketplace: nft.marketplace,
            newOwner: currentOwner
          });

          processed.push({ mint: nft.mint_address, action: 'sale', price: prices.salePrice });
          continue;
        }

        // Case 5: New listing (now escrow, wasn't before)
        if (isCurrentEscrow && !wasEscrow) {
          console.log('📝 Potential listing, checking price...');
          
          const prices = await extractPricesFromTransaction(connection, tokenAccount.address);
          if (!prices?.listPrice) {
            console.log('⚠️ Could not determine list price, logging for manual review');
            manualReview.push({ 
              mint: nft.mint_address, 
              reason: 'Could not determine list price',
              currentOwner,
              previousOwner: nft.owner_wallet
            });
            continue;
          }

          const marketplace = getMarketplaceName(currentOwner);
          
          await client.query(`
            UPDATE nft_metadata 
            SET owner_wallet = $1,
                is_listed = true,
                marketplace = $2,
                list_price = $3,
                original_lister = $4
            WHERE mint_address = $5`,
            [currentOwner, marketplace, prices.listPrice, nft.owner_wallet, nft.mint_address]
          );

          await sendDiscordNotification({
            type: 'listing',
            nft,
            marketplace,
            listPrice: prices.listPrice,
            originalOwner: nft.owner_wallet
          });

          processed.push({ mint: nft.mint_address, action: 'list', price: prices.listPrice });
          continue;
        }

      } catch (error) {
        console.error(`❌ Error processing NFT ${nft.mint_address}:`, error);
        errors.push({ 
          mint: nft.mint_address, 
          error: error.message 
        });
      }
    }

    // Log final results
    console.log('\n=== Final Results ===');
    console.log(`✓ Successfully processed: ${processed.length}`);
    console.log(`⚠️ Need manual review: ${manualReview.length}`);
    console.log(`❌ Errors: ${errors.length}`);

    // Write detailed logs
    await logToFile('processed-nfts', processed);
    await logToFile('manual-review', manualReview);
    await logToFile('errors', errors);

  } catch (error) {
    console.error('Error in syncNFTOwnership:', error);
    throw error;
  } finally {
    client.release();
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

export default syncNFTOwnership; 