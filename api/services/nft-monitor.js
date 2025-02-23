import { Connection, PublicKey } from '@solana/web3.js';
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
    id: 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',
    name: 'Tensor'
  }
};

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
      
      // Get all Fcked Catz NFTs from our database using symbol
      const nfts = await this.withDbClient(async (client) => {
        const result = await client.query(`
          SELECT mint_address, owner_wallet, owner_discord_id 
          FROM nft_metadata 
          WHERE symbol = 'FCKEDCATZ'
        `);
        return result.rows;
      });
      
      console.log(`Found ${nfts.length} Fcked Catz NFTs to monitor`);

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
      
      // Monitor logs for this token account
      const subscriptionId = this.connection.onLogs(
        tokenAccount.address,
        async (logs) => {
          // Get the transaction details
          const tx = await this.connection.getTransaction(logs.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: 'confirmed'
          });
          
          if (!tx) return;
          
          // Get the account info
          const accountInfo = await this.connection.getAccountInfo(tokenAccount.address);
          if (!accountInfo) return;
          
          // Process the update with full transaction data
          await this.handleNFTUpdateWithRetry(mintAddress, tokenAccount.address, accountInfo, tx.meta);
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

  async handleNFTUpdateWithRetry(mintAddress, tokenAccountAddress, accountInfo, meta) {
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
            tokenAccount: tokenAccountAddress,
            owner: newOwner
          });
          return;
        }

        // Check for SOL transfers and listing price in inner instructions
        let isSale = false;
        let salePrice = 0;
        let listPrice = 0;
        let originalOwner = currentOwner;
        
        if (meta?.innerInstructions) {
          console.log('Analyzing inner instructions for SOL transfers and listing data...');
          meta.innerInstructions.forEach((inner, i) => {
            inner.instructions.forEach((ix, j) => {
              const program = meta.transaction.message.accountKeys[ix.programIdIndex].toBase58();
              
              if (program === '11111111111111111111111111111111') { // System program
                const data = Buffer.from(ix.data);
                if (data[0] === 2) { // Transfer instruction
                  const amount = data.readBigUInt64LE(1);
                  const solAmount = Number(amount) / 1000000000; // LAMPORTS_PER_SOL
                  if (solAmount > 0.001) { // Ignore dust transfers
                    console.log(`Found SOL transfer: ${solAmount} SOL`);
                    isSale = true;
                    salePrice = solAmount;
                  }
                }
              } else if (program === MARKETPLACE_ESCROWS.MAGICEDEN.id || 
                        program === MARKETPLACE_ESCROWS.TENSOR.id) {
                // Parse listing price from marketplace instruction
                try {
                  const listingData = Buffer.from(ix.data);
                  // First 8 bytes are typically instruction discriminator
                  // Next 8 bytes are the price in lamports
                  if (listingData.length >= 16) {
                    const lamports = listingData.readBigUInt64LE(8);
                    listPrice = Number(lamports) / 1000000000; // LAMPORTS_PER_SOL
                    console.log(`Found listing price: ${listPrice} SOL`);
                  }
                } catch (parseError) {
                  console.error('Error parsing listing price:', parseError);
                }
              }
            });
          });
        }

        console.log('Processing ownership change:', {
          mintAddress,
          tokenAccount: tokenAccountAddress,
          currentOwner,
          newOwner,
          originalOwner,
          isEscrowOld: this.isEscrowWallet(currentOwner),
          isEscrowNew: this.isEscrowWallet(newOwner),
          isSale,
          salePrice,
          listPrice
        });

        // Process the update with price information
        await this.handleNFTUpdate(mintAddress, newOwner, isSale, salePrice, listPrice, originalOwner);
        return;

      } catch (error) {
        retries--;
        if (retries === 0) {
          console.error(`Failed to handle NFT update after all retries:`, {
            mintAddress,
            tokenAccount: tokenAccountAddress,
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
          last_sale_price, marketplace
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

      console.log('NFT update details:', {
        mintAddress,
        currentOwner,
        newOwner,
        isListed: nft.is_listed,
        isEscrowCurrent: this.isEscrowWallet(currentOwner),
        isEscrowNew: this.isEscrowWallet(newOwner),
        isSale,
        salePrice
      });

      // Different handling based on wallet types
      if (this.isEscrowWallet(newOwner)) {
        // Transfer TO escrow = Listing
        await this.handleListing(client, nft, newOwner, listPrice, originalOwner);
      } else if (this.isEscrowWallet(currentOwner)) {
        // If coming from escrow, check if it's a sale or delist
        if (isSale) {
          await this.handleSale(client, nft, newOwner, salePrice);
        } else {
          await this.handleDelist(client, nft, newOwner);
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
    // First transaction: Update owner and sale price
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE nft_metadata 
         SET owner_wallet = $1,
             last_sale_price = $2,
             marketplace = NULL
         WHERE mint_address = $3`,
        [newOwner, salePrice, nft.mint_address]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Second transaction: Clear listing status
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE nft_metadata 
         SET is_listed = false,
             list_price = NULL
         WHERE mint_address = $1`,
        [nft.mint_address]
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

    // Send sale notification
    await this.sendDiscordNotification({
      type: 'sale',
      nft: rows[0],
      price: salePrice,
      oldOwner: nft.owner_wallet,
      oldOwnerDiscordId: nft.owner_discord_id,
      newOwner: newOwner,
      marketplace: nft.marketplace
    });
  }

  async handleDelist(client, nft, newOwner) {
    // Update NFT with new owner and clear listing
    await client.query(
      `UPDATE nft_metadata 
       SET owner_wallet = $1,
           is_listed = false,
           list_price = NULL,
           marketplace = NULL
       WHERE mint_address = $2`,
      [newOwner, nft.mint_address]
    );

    // Get updated NFT data for notification
    const { rows } = await client.query(
      'SELECT * FROM nft_metadata WHERE mint_address = $1',
      [nft.mint_address]
    );

    // Send delist notification
    await this.sendDiscordNotification({
      type: 'delist',
      nft: rows[0],
      marketplace: nft.marketplace
    });
  }

  async handleTransfer(client, nft, newOwner) {
    // First transaction: Update owner and clear marketplace
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE nft_metadata 
         SET owner_wallet = $1,
             marketplace = NULL
         WHERE mint_address = $2`,
        [newOwner, nft.mint_address]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

    // Second transaction: Clear listing status
    await client.query('BEGIN');
    try {
      await client.query(
        `UPDATE nft_metadata 
         SET is_listed = false,
             list_price = NULL
         WHERE mint_address = $1`,
        [nft.mint_address]
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

    // Send transfer notification with Discord info
    await this.sendDiscordNotification({
      type: 'transfer',
      nft: rows[0],
      oldOwner: nft.owner_wallet,
      oldOwnerDiscordId: nft.owner_discord_id,
      newOwner: newOwner
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

    const getWalletLink = (wallet, discordId) => {
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
      case 'sale':
        return {
          embeds: [{
            ...baseEmbed,
            title: `🛍️ SALE - ${nft.name}`,
            description: `${getMarketplaceLinks(nft.mint_address)}\n\nMint: \`${nft.mint_address}\``,
            fields: [
              {
                name: '💰 Price',
                value: `${data.price} SOL`,
                inline: true
              },
              {
                name: '📤 Seller',
                value: getWalletLink(data.oldOwner, data.oldOwnerDiscordId),
                inline: true
              },
              {
                name: '📥 Buyer',
                value: getWalletLink(data.newOwner, data.newOwnerDiscordId),
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              },
              {
                name: '🏪 Marketplace',
                value: data.marketplace || 'Unknown',
                inline: true
              }
            ]
          }]
        };

      case 'transfer':
        return {
          embeds: [{
            ...baseEmbed,
            title: `🔄 TRANSFER - ${nft.name}`,
            description: `${getMarketplaceLinks(nft.mint_address)}\n\nMint: \`${nft.mint_address}\``,
            fields: [
              {
                name: '📤 From',
                value: getWalletLink(data.oldOwner, data.oldOwnerDiscordId),
                inline: true
              },
              {
                name: '📥 To',
                value: getWalletLink(data.newOwner, data.newOwnerDiscordId),
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

      case 'list':
        return {
          embeds: [{
            ...baseEmbed,
            title: `📝 LISTING - ${nft.name}`,
            description: `${getMarketplaceLinks(nft.mint_address)}\n\nMint: \`${nft.mint_address}\``,
            fields: [
              {
                name: '💰 Price',
                value: `${data.listPrice.toFixed(2)} SOL`,
                inline: true
              },
              {
                name: '👤 Owner',
                value: getWalletLink(data.originalOwner, nft.owner_discord_id),
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              },
              {
                name: '🏪 Marketplace',
                value: data.marketplace || 'Unknown',
                inline: true
              }
            ]
          }]
        };

      case 'delist':
        return {
          embeds: [{
            ...baseEmbed,
            title: `❌ DELIST - ${nft.name}`,
            description: `${getMarketplaceLinks(nft.mint_address)}\n\nMint: \`${nft.mint_address}\``,
            fields: [
              {
                name: '👤 Owner',
                value: getWalletLink(nft.owner_wallet, nft.owner_discord_id),
                inline: true
              },
              {
                name: '✨ Rarity',
                value: nft.rarity_rank ? `Rank #${nft.rarity_rank}` : 'N/A',
                inline: true
              },
              {
                name: '🏪 Marketplace',
                value: data.marketplace || 'Unknown',
                inline: true
              }
            ]
          }]
        };
    }
  }

  isEscrowWallet(address) {
    return this.escrowWallets.has(address);
  }

  getMarketplaceName(address) {
    return Object.values(MARKETPLACE_ESCROWS).find(m => m.id === address)?.name || 'Unknown Marketplace';
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping NFT monitor service...');
    
    // Clear retry interval
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    // Unsubscribe from all WebSocket subscriptions
    for (const [mintAddress, subscriptionId] of this.subscriptions) {
      try {
        await this.connection.removeAccountChangeListener(subscriptionId);
        console.log(`Stopped monitoring NFT: ${mintAddress}`);
      } catch (error) {
        console.error(`Error stopping monitor for NFT ${mintAddress}:`, error);
      }
    }

    this.subscriptions.clear();
    this.pendingNFTs.clear();
    this.isRunning = false;
    console.log('NFT monitor service stopped');
  }
}

export default NFTMonitorService; 