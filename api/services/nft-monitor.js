import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { pool } from '../../api/config/database.js';
import { WebSocket } from 'ws';
import fetch from 'node-fetch';
import { sendActivityNotification } from '../integrations/discord/notifications.js';

// Known marketplace escrow wallets
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

// Standard Solana system program address used for burns
const BURN_ADDRESS = '11111111111111111111111111111111';

class NFTMonitorService {
  constructor(rpcEndpoint) {
    console.log('NFTMonitorService init:', {
      rpcEndpoint,
      type: typeof rpcEndpoint,
      startsWithHttp: rpcEndpoint?.startsWith('http')
    });

    if (!rpcEndpoint?.startsWith('http')) {
      throw new Error('Invalid RPC endpoint URL format');
    }

    this.connection = new Connection(rpcEndpoint, {
      wsEndpoint: rpcEndpoint.replace('https', 'wss'),
      commitment: 'confirmed'
    });
    this.subscriptions = new Map();
    this.isRunning = false;
    this.pendingNFTs = new Set();
    this.retryDelay = 1000; // Start with 1 second
    this.maxRetryDelay = 30000; // Max 30 seconds
    this.dbRetryAttempts = 3;
    this.dbRetryDelay = 1000;
    
    // Add escrow tracking
    this.escrowWallets = new Set(Object.values(MARKETPLACE_ESCROWS).map(m => m.id));
  }

  async withDbClient(operation) {
    let client;
    let attempts = this.dbRetryAttempts;
    let delay = this.dbRetryDelay;

    while (attempts > 0) {
      try {
        client = await pool.connect();
        
        // Set shorter statement timeout and idle timeout
        await client.query('SET statement_timeout = 10000');
        await client.query('SET idle_in_transaction_session_timeout = 10000');
        
        const result = await operation(client);
        return result;
      } catch (error) {
        attempts--;
        if (attempts === 0) throw error;
        
        console.error('Database operation failed, retrying:', {
          error: error.message,
          attemptsLeft: attempts,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } finally {
        if (client) {
          try {
            await client.release();
          } catch (releaseError) {
            console.error('Error releasing client:', releaseError);
          }
        }
      }
    }
  }

  async start() {
    if (this.isRunning) {
      console.log('Monitor service is already running');
      return;
    }

    try {
      console.log('Starting NFT monitor service...');
      
      // Get NFTs from all collections from our database
      const nfts = await this.withDbClient(async (client) => {
        const result = await client.query(`
          SELECT mint_address, owner_wallet, owner_discord_id 
          FROM nft_metadata 
          WHERE symbol IN ('FCKEDCATZ', 'MM', 'MM3D', 'AIBB', 'CelebCatz')
        `);
        return result.rows;
      });
      
      console.log(`Found ${nfts.length} NFTs to monitor`);

      // Log count by collection
      const collectionCounts = await this.withDbClient(async (client) => {
        const result = await client.query(`
          SELECT symbol, COUNT(*) as count
          FROM nft_metadata 
          WHERE symbol IN ('FCKEDCATZ', 'MM', 'MM3D', 'AIBB', 'CelebCatz')
          GROUP BY symbol
          ORDER BY symbol
        `);
        return result.rows;
      });

      console.log('\nNFTs by collection:');
      collectionCounts.forEach(row => {
        console.log(`${row.symbol}: ${row.count} NFTs`);
      });

      // Subscribe to account changes for each NFT with rate limiting
      for (const nft of nfts) {
        await this.monitorNFTWithRetry(nft.mint_address);
        // Add delay between subscriptions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.isRunning = true;
      console.log('NFT monitor service started successfully');

      // Start retry loop for pending NFTs
      this.startRetryLoop();

    } catch (error) {
      console.error('Error starting NFT monitor service:', error);
      throw error;
    }
  }

  async monitorNFTWithRetry(mintAddress) {
    try {
      await this.monitorNFT(mintAddress);
    } catch (error) {
      console.error(`Failed to monitor NFT ${mintAddress}, adding to retry queue:`, error);
      this.pendingNFTs.add(mintAddress);
    }
  }

  async startRetryLoop() {
    if (this.retryInterval) return;
    
    this.retryInterval = setInterval(async () => {
      if (this.pendingNFTs.size === 0) return;
      
      console.log(`Retrying ${this.pendingNFTs.size} pending NFTs...`);
      
      for (const mintAddress of this.pendingNFTs) {
        try {
          await this.monitorNFT(mintAddress);
          this.pendingNFTs.delete(mintAddress);
          // Reset retry delay on success
          this.retryDelay = 1000;
        } catch (error) {
          console.error(`Retry failed for NFT ${mintAddress}:`, error);
          // Exponential backoff
          this.retryDelay = Math.min(this.retryDelay * 2, this.maxRetryDelay);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }, 5000); // Check every 5 seconds
  }

  async monitorNFT(mintAddress) {
    try {
      const mint = new PublicKey(mintAddress);
      
      // Get token account(s) for this mint
      const tokenAccounts = await this.connection.getTokenLargestAccounts(mint);
      const tokenAccount = tokenAccounts.value[0];
      
      console.log(`Setting up monitor for NFT: ${mintAddress} (Token Account: ${tokenAccount.address})`);
      
      // Monitor the token account that holds the NFT
      const subscriptionId = this.connection.onAccountChange(
        tokenAccount.address,
        async (accountInfo) => {
          try {
            console.log(`Account change detected for NFT: ${mintAddress}`);
            
            // Parse token account data
            const tokenData = this.parseTokenAccountData(accountInfo.data);
            if (!tokenData?.isValidNFTAmount) {
              console.log(`Skipping non-NFT token account: ${tokenAccount.address}`);
              return;
            }

            // Get the new owner
            const newOwner = tokenData.owner;
            if (!newOwner || newOwner.length > 44) {
              console.error('Invalid owner address:', { newOwner, length: newOwner?.length });
              return;
            }

            // Get current owner from database
            const currentOwner = await this.getCurrentOwner(mintAddress);
            console.log('Ownership check:', {
              mintAddress,
              currentOwner,
              newOwner,
              isEscrowNew: this.isEscrowWallet(newOwner),
              isEscrowCurrent: this.isEscrowWallet(currentOwner)
            });

            if (currentOwner === newOwner) {
              console.log('Skipping update - owner unchanged:', {
                mintAddress,
                owner: newOwner
              });
              return;
            }

            // Get recent transactions for this token account to find the ownership change
            console.log('Fetching recent transactions for ownership change...');
            const signatures = await this.connection.getSignaturesForAddress(
              tokenAccount.address,
              { limit: 5 },
              'confirmed'
            );

            // Process each transaction until we find the ownership change
            let transactionFound = false;
            for (const sig of signatures) {
              const tx = await this.connection.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0
              });

              if (!tx) {
                console.log(`Transaction ${sig.signature} not found`);
                continue;
              }

              console.log('Processing transaction:', {
                signature: sig.signature,
                logMessages: tx.meta?.logMessages,
                postBalances: tx.meta?.postBalances,
                preBalances: tx.meta?.preBalances,
                innerInstructions: tx.meta?.innerInstructions
              });

              let listPrice = 0;
              let salePrice = 0;

              // Check for Magic Eden transaction in logs
              const isMagicEden = tx.meta?.logMessages?.some(log => 
                log.includes('Program M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K invoke')
              );

              if (isMagicEden) {
                console.log('Found Magic Eden transaction');
                // Look for price in log messages
                const priceLog = tx.meta?.logMessages?.find(log => 
                  log.includes('"price":') && log.includes('"seller_expiry"')
                );
                
                if (priceLog) {
                  try {
                    console.log('Found price log:', priceLog);
                    const priceMatch = priceLog.match(/"price":(\d+)/);
                    if (priceMatch) {
                      const lamports = parseInt(priceMatch[1]);
                      const price = lamports / LAMPORTS_PER_SOL;
                      console.log('Extracted price:', { lamports, price });
                      
                      // If going to escrow, it's a list price
                      if (this.isEscrowWallet(newOwner)) {
                        listPrice = price;
                      } else {
                        salePrice = price;
                      }
                    }
                  } catch (error) {
                    console.error('Error parsing price from log:', error);
                  }
                }
                transactionFound = true;
              } else {
                // If not a Magic Eden transaction, treat as a transfer
                console.log('Processing as transfer transaction');
                transactionFound = true;
              }

              if (transactionFound) {
                // Process the ownership change with any prices found
                await this.handleNFTUpdate(
                  mintAddress,
                  newOwner,
                  salePrice > 0,
                  salePrice,
                  listPrice,
                  currentOwner
                );
                break;
              }
            }

            if (!transactionFound) {
              console.log('No relevant transaction found, processing as transfer');
              await this.handleNFTUpdate(
                mintAddress,
                newOwner,
                false,
                0,
                0,
                currentOwner
              );
            }

          } catch (error) {
            console.error('Error in account change handler:', error);
          }
        },
        'confirmed'
      );

      this.subscriptions.set(mintAddress, subscriptionId);
      console.log(`Monitoring started for NFT: ${mintAddress} (Token Account: ${tokenAccount.address})`);

    } catch (error) {
      console.error(`Error setting up monitor for NFT ${mintAddress}:`, error);
      throw error;
    }
  }

  async handleNFTUpdateWithRetry(mintAddress, tokenAccountAddress, accountInfo, listPrice = 0, salePrice = 0, isSale = false) {
    let retries = 3;
    let delay = 1000;

    while (retries > 0) {
      try {
        // Skip empty/closed accounts
        if (accountInfo.data.length === 0) {
          console.log(`Skipping empty token account: ${tokenAccountAddress}`);
          return;
        }

        // Parse token account data
        const tokenData = this.parseTokenAccountData(accountInfo.data);
        if (!tokenData?.isValidNFTAmount) {
          console.log(`Skipping non-NFT token account: ${tokenAccountAddress}`);
          return;
        }

        // Get the new owner
        const newOwner = tokenData.owner;
        if (!newOwner || newOwner.length > 44) {
          console.error('Invalid owner address:', { newOwner, length: newOwner?.length });
          return;
        }

        // Verify the owner actually changed
        const currentOwner = await this.getCurrentOwner(mintAddress);
        if (currentOwner === newOwner) {
          console.log('Skipping update - owner unchanged:', {
            mintAddress,
            owner: newOwner
          });
          return;
        }

        console.log('Processing ownership change:', {
          mintAddress,
          currentOwner,
          newOwner,
          isEscrowOld: this.isEscrowWallet(currentOwner),
          isEscrowNew: this.isEscrowWallet(newOwner),
          listPrice,
          salePrice,
          isSale
        });

        // Process the update with extracted prices
        await this.handleNFTUpdate(mintAddress, newOwner, isSale, salePrice, listPrice, currentOwner);
        return;

      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(`Failed to handle NFT update after all retries:`, {
            mintAddress,
            error: error.message
          });
          return;
        }
        console.log(`Retrying NFT update after ${delay}ms:`, {
          mintAddress,
          tokenAccount: tokenAccountAddress
        });
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }

  async handleNFTUpdate(mintAddress, newOwner, isSale = false, salePrice = 0, listPrice = 0, originalOwner) {
    if (!mintAddress || !newOwner) {
      console.error('Missing required parameters:', { mintAddress, newOwner });
      return;
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current NFT state with FOR UPDATE lock
      const { rows } = await client.query(
        `SELECT 
          mint_address, name, symbol, owner_wallet, owner_discord_id, 
          owner_name, rarity_rank, image_url, is_listed, list_price,
          last_sale_price, marketplace, original_lister
        FROM nft_metadata 
        WHERE mint_address = $1
         FOR UPDATE NOWAIT`,
        [mintAddress]
      );

      if (!rows.length) {
        console.log(`NFT ${mintAddress} not found in database`);
        await client.query('ROLLBACK');
        return;
      }

      const nft = rows[0];
      const currentOwner = nft.owner_wallet;

      // Skip if it's the same owner (could be a failed tx or marketplace operation)
      if (currentOwner === newOwner) {
        console.log(`Skipping update for ${mintAddress} - same owner`);
        await client.query('ROLLBACK');
        return;
      }

      // Check for burn first
      if (newOwner === BURN_ADDRESS) {
        await this.handleBurn(client, nft);
      }
      // Different handling based on wallet types
      else if (this.isEscrowWallet(newOwner)) {
        // Transfer TO escrow = Listing
        await this.handleListing(client, nft, newOwner, listPrice, originalOwner);
      } else if (this.isEscrowWallet(currentOwner)) {
        // Extract sale price from escrow transfer if not provided
        if (!salePrice && nft.list_price) {
          salePrice = nft.list_price; // Use listing price as sale price
        }
        
        // Coming from escrow - check if it's a sale or delist
        if (newOwner === nft.original_lister) {
          // If going back to original lister, it's a delist
          await this.handleDelist(client, nft, newOwner);
        } else {
          // If going to a new wallet, it's a sale
          await this.handleSale(client, nft, newOwner, salePrice);
        }
      } else {
        // Regular transfer between wallets
        await this.handleTransfer(client, nft, newOwner);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(rollbackError => {
        console.error('Error rolling back transaction:', rollbackError);
      });
      
      if (error.code === '55P03') { // Lock not available
        console.log(`Lock not available for NFT ${mintAddress}, will retry later`);
        return;
      }
      
      console.error(`Error handling NFT update for ${mintAddress}:`, error);
    } finally {
      client.release();
    }
  }

  async handleBurn(client, nft) {
    console.log(`Handling burn for NFT: ${nft.mint_address}`);
    
    // Send burn notification before deleting
    await this.sendDiscordNotification({
      type: 'burn',
      nft: nft
    });

    // Delete the NFT entry
    await client.query(
      'DELETE FROM nft_metadata WHERE mint_address = $1',
      [nft.mint_address]
    );
  }

  async handleListing(client, nft, escrowWallet, listPrice, originalOwner) {
    const marketplace = this.getMarketplaceName(escrowWallet);
    
    // Single transaction with conditional updates
    await client.query('BEGIN');
    try {
      // Update owner, marketplace, and list price
      await client.query(
        `UPDATE nft_metadata 
         SET owner_wallet = $1,
             marketplace = $2,
             list_price = $3,
             is_listed = true,
             original_lister = $4
         WHERE mint_address = $5
         AND (owner_wallet != $1 OR marketplace != $2 OR list_price != $3 OR is_listed = false)`,
        [escrowWallet, marketplace, listPrice, originalOwner, nft.mint_address]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Get updated NFT data for notification
    const { rows } = await client.query(
      'SELECT * FROM nft_metadata WHERE mint_address = $1',
      [nft.mint_address]
    );
    
    // Send listing notification with original owner
    await this.sendDiscordNotification({
      type: 'list',
      nft: rows[0],
      marketplace,
      originalOwner,
      listPrice
    });
  }

  async handleSale(client, nft, newOwner, salePrice) {
    // Store original owner info before updating
    const originalOwner = nft.owner_wallet;
    const originalOwnerDiscordId = nft.owner_discord_id;
    const originalOwnerName = nft.owner_name;
    const originalLister = nft.original_lister;
    const listerDiscordName = nft.lister_discord_name;

    // First transaction: Update owner and sale price
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE nft_metadata 
         SET owner_wallet = $1,
             last_sale_price = $2,
             marketplace = NULL,
             is_listed = false,
             list_price = NULL,
             original_lister = NULL,
             lister_discord_name = NULL
         WHERE mint_address = $3`,
        [newOwner, salePrice, nft.mint_address]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Get updated NFT data for notification
    const { rows } = await client.query(
      'SELECT n.*, ur.discord_name as new_owner_name FROM nft_metadata n LEFT JOIN user_roles ur ON ur.wallet_address = n.owner_wallet WHERE n.mint_address = $1',
      [nft.mint_address]
    );

    // Send sale notification
    await this.sendDiscordNotification({
      type: 'sale',
      nft: rows[0],
      price: salePrice,
      oldOwner: originalLister || originalOwner,
      oldOwnerDiscordId: originalOwnerDiscordId,
      oldOwnerName: listerDiscordName || originalOwnerName,
      newOwner: newOwner,
      newOwnerName: rows[0]?.new_owner_name,
      marketplace: nft.marketplace
    });
  }

  async handleDelist(client, nft, newOwner) {
    // Store info before clearing it
    const marketplace = nft.marketplace;
    const originalOwnerDiscordId = nft.owner_discord_id;
    const originalOwnerWallet = nft.owner_wallet;
    const listerDiscordName = nft.lister_discord_name;

    // Update NFT with new owner and clear listing
    await client.query('BEGIN');
    try {
      // First clear the original_lister and associated fields
      await client.query(
        `UPDATE nft_metadata 
         SET original_lister = NULL,
             lister_discord_name = NULL
         WHERE mint_address = $1`,
        [nft.mint_address]
      );

      // Then update ownership and other listing fields
      await client.query(
        `UPDATE nft_metadata 
         SET owner_wallet = $1,
             is_listed = false,
             list_price = NULL,
             marketplace = NULL
         WHERE mint_address = $2`,
        [newOwner, nft.mint_address]
      );

      // Get updated NFT data for notification AFTER the update
      const { rows } = await client.query(
        'SELECT * FROM nft_metadata WHERE mint_address = $1',
        [nft.mint_address]
      );

      await client.query('COMMIT');

      // Send delist notification with original owner info and marketplace
      await this.sendDiscordNotification({
        type: 'delist',
        nft: rows[0],
        marketplace: marketplace,
        oldOwner: originalOwnerWallet,
        oldOwnerDiscordId: originalOwnerDiscordId,
        listerDiscordName: listerDiscordName
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  async handleTransfer(client, nft, newOwner) {
    console.log('Handling transfer:', {
      nft: nft.mint_address,
      from: nft.owner_wallet,
      to: newOwner
    });

    // Store original owner info before updating
    const originalOwner = nft.owner_wallet;
    const originalOwnerDiscordId = nft.owner_discord_id;
    const originalOwnerName = nft.owner_name;

    // First get the new owner's Discord info if available
    const { rows: newOwnerInfo } = await client.query(
      'SELECT discord_name, discord_id FROM user_roles WHERE wallet_address = $1',
      [newOwner]
    );

    // Update NFT ownership
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE nft_metadata 
         SET owner_wallet = $1,
             marketplace = NULL,
             is_listed = false,
             list_price = NULL,
             original_lister = NULL
         WHERE mint_address = $2`,
        [newOwner, nft.mint_address]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Get updated NFT data for notification
    const { rows } = await client.query(
      'SELECT * FROM nft_metadata WHERE mint_address = $1',
      [nft.mint_address]
    );

    if (rows.length === 0) {
      console.error('NFT not found after transfer update:', nft.mint_address);
      return;
    }

    // Send transfer notification with Discord info
    await this.sendDiscordNotification({
      type: 'transfer',
      nft: rows[0],
      oldOwner: originalOwner,
      oldOwnerDiscordId: originalOwnerDiscordId,
      oldOwnerName: originalOwnerName,
      newOwner: newOwner,
      newOwnerDiscordId: newOwnerInfo[0]?.discord_id,
      newOwnerName: newOwnerInfo[0]?.discord_name
    });

    console.log('Transfer handled successfully:', {
      nft: nft.mint_address,
      from: originalOwner,
      fromName: originalOwnerName,
      to: newOwner,
      toName: newOwnerInfo[0]?.discord_name
    });
  }

  parseTokenAccountData(data) {
    try {
      // Skip if data is empty
      if (!data || data.length === 0) {
        return null;
      }

      // Token Account data layout (SPL Token v2)
      const dataLayout = {
        mint: { offset: 0, length: 32 },
        owner: { offset: 32, length: 32 },
        amount: { offset: 64, length: 8 },
        delegate: { offset: 72, length: 32 },
        state: { offset: 104, length: 1 },
        isNative: { offset: 105, length: 1 },
        delegatedAmount: { offset: 106, length: 8 },
        closeAuthority: { offset: 114, length: 32 }
      };

      // Extract owner and amount
      const ownerBytes = data.slice(dataLayout.owner.offset, dataLayout.owner.offset + dataLayout.owner.length);
      const amountBytes = data.slice(dataLayout.amount.offset, dataLayout.amount.offset + dataLayout.amount.length);
      
      // Convert amount to BigInt (u64)
      const amount = BigInt('0x' + Buffer.from(amountBytes).toString('hex'));
      
      // Convert owner to base58 string
      const owner = new PublicKey(ownerBytes).toBase58();

      // For NFTs, amount of 1 is represented as 1 << 56
      const isValidNFTAmount = amount === BigInt('72057594037927936'); // 1 << 56

      return { owner, amount, isValidNFTAmount };
    } catch (error) {
      console.error('Error parsing token account data:', error);
      return null;
    }
  }

  async getCurrentOwner(mintAddress) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT owner_wallet FROM nft_metadata WHERE mint_address = $1',
        [mintAddress]
      );
      return rows[0]?.owner_wallet;
    } finally {
      client.release();
    }
  }

  async getOriginalLister(mintAddress) {
    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT original_lister FROM nft_metadata WHERE mint_address = $1',
        [mintAddress]
      );
      return rows[0]?.original_lister;
    } finally {
      client.release();
    }
  }

  async sendDiscordNotification(data) {
    try {
      const message = this.formatDiscordMessage(data);
      const success = await sendActivityNotification(message);
      if (!success) {
        console.error('Failed to send activity notification');
      }
    } catch (error) {
      console.error('Error sending Discord notification:', error);
    }
  }

  async testWebhook() {
    console.log('Testing Discord activity notifications...');
    try {
      const testMessage = {
        embeds: [{
          title: '🔔 Fcked Catz Monitor - Test Message',
          description: 'If you can see this message, the activity notifications are working correctly!',
          fields: [
            { name: 'Collection', value: 'Fcked Catz', inline: true },
            { name: 'Status', value: 'Connected', inline: true },
            { name: 'Collection Address', value: 'EPeeeDr21EPJ4GJgjuRJ8SHD4A2d59erMaTtWaTT2hqm', inline: false }
          ],
          color: 0x00ff00,
          timestamp: new Date().toISOString()
        }]
      };

      console.log('Sending test message...');
      const success = await sendActivityNotification(testMessage);
      
      if (!success) {
        console.error('Failed to send activity notification');
        return false;
      }

      console.log('Test message sent successfully');
      return true;
    } catch (error) {
      console.error('Error testing activity notifications:', error);
      return false;
    }
  }

  formatDiscordMessage(data) {
    const nft = data.nft;
    const baseEmbed = {
      color: 0xFF4D4D, // Red to match Fcked Cat theme
      timestamp: new Date().toISOString(),
      footer: {
        text: 'BUXDAO • Putting Community First',
        icon_url: 'https://buxdao.com/logos/buxdao.png'
      }
    };

    // Set collection-specific thumbnail based on symbol
    const getCollectionLogo = (symbol) => {
      switch (symbol) {
        case 'FCKEDCATZ':
          return 'https://buxdao.com/logos/cat.PNG';
        case 'CelebCatz':
          return 'https://buxdao.com/logos/celeb.PNG';
        case 'MM':
          return 'https://buxdao.com/logos/monster.PNG';
        case 'MM3D':
          return 'https://buxdao.com/logos/monster.PNG';
        case 'AIBB':
          return 'https://buxdao.com/logos/bot.PNG';
        default:
          return 'https://buxdao.com/logos/fckedcatz.png';
      }
    };

    // Add collection logo thumbnail
    baseEmbed.thumbnail = {
      url: getCollectionLogo(nft.symbol)
    };

    // Handle local vs remote image URLs
    const imageUrl = nft.image_url?.startsWith('http') 
      ? nft.image_url 
      : `https://buxdao.com${nft.image_url}`;

    if (imageUrl) {
      baseEmbed.image = { url: imageUrl };
    }

    const getWalletLink = (wallet, discordId, discordName) => {
      if (discordName) {
        return discordName;
      }
      if (discordId) {
        return `<@${discordId}>`;
      }
      return wallet ? 
        `[\`${wallet.slice(0, 4)}...${wallet.slice(-4)}\`](https://solscan.io/account/${wallet})` :
        'Unknown';
    };

    const getMarketplaceLinks = (mint) => 
      `[View on Magic Eden](https://magiceden.io/item-details/${mint}) • [View on Tensor](https://www.tensor.trade/item/${mint})`;

    switch (data.type) {
      case 'list':
        return {
          embeds: [{
            ...baseEmbed,
            title: `📝 LISTED - ${nft.name}`,
            description: getMarketplaceLinks(nft.mint_address),
            fields: [
              {
                name: '👤 Listed By',
                value: nft.lister_discord_name || getWalletLink(data.originalOwner, nft.owner_discord_id, nft.owner_name),
                inline: true
              },
              {
                name: '💰 Price',
                value: `${data.listPrice.toFixed(2)} SOL`,
                inline: true
              },
              {
                name: '🏪 Marketplace',
                value: data.marketplace,
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              }
            ]
          }]
        };

      case 'sale':
        return {
          embeds: [{
            ...baseEmbed,
            title: `💰 SOLD - ${nft.name}`,
            description: getMarketplaceLinks(nft.mint_address),
            fields: [
              {
                name: '👤 Seller',
                value: data.oldOwnerName || getWalletLink(data.oldOwner, data.oldOwnerDiscordId, data.oldOwnerName),
                inline: true
              },
              {
                name: '👥 Buyer',
                value: data.newOwnerName || getWalletLink(data.newOwner, data.newOwnerDiscordId, data.newOwnerName),
                inline: true
              },
              {
                name: '💰 Price',
                value: `${data.price.toFixed(2)} SOL`,
                inline: true
              },
              {
                name: '🏪 Marketplace',
                value: data.marketplace,
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              }
            ]
          }]
        };

      case 'delist':
        return {
          embeds: [{
            ...baseEmbed,
            title: `🔄 DELISTED - ${nft.name}`,
            description: getMarketplaceLinks(nft.mint_address),
            fields: [
              {
                name: '👤 Owner',
                value: data.listerDiscordName || getWalletLink(data.oldOwner, data.oldOwnerDiscordId, data.oldOwnerName),
                inline: true
              },
              {
                name: '🏪 Marketplace',
                value: data.marketplace,
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              }
            ]
          }]
        };

      case 'transfer':
        return {
          embeds: [{
            ...baseEmbed,
            title: `📤 TRANSFERRED - ${nft.name}`,
            description: getMarketplaceLinks(nft.mint_address),
            fields: [
              {
                name: '👤 From',
                value: data.oldOwnerName || getWalletLink(data.oldOwner, data.oldOwnerDiscordId, data.oldOwnerName),
                inline: true
              },
              {
                name: '👥 To',
                value: data.newOwnerName || getWalletLink(data.newOwner, data.newOwnerDiscordId, data.newOwnerName),
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              }
            ]
          }]
        };

      case 'burn':
        return {
          embeds: [{
            ...baseEmbed,
            title: `🔥 BURNT - ${nft.name}`,
            description: `This NFT has been burned and removed from circulation.\n\n${getMarketplaceLinks(nft.mint_address)}`,
            fields: [
              {
                name: '👤 Last Owner',
                value: getWalletLink(nft.owner_wallet, nft.owner_discord_id, nft.owner_name),
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              }
            ]
          }]
        };

      default:
        console.error('Unknown notification type:', data.type);
        return null;
    }
  }

  isEscrowWallet(address) {
    return this.escrowWallets.has(address);
  }

  getMarketplaceName(escrowWallet) {
    return Object.values(MARKETPLACE_ESCROWS).find(m => m.id === escrowWallet)?.name || 'Unknown';
  }
}

export default NFTMonitorService;