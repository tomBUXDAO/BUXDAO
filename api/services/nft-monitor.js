import { Connection, PublicKey } from '@solana/web3.js';
import { pool } from '../../api/config/database.js';
import { WebSocket } from 'ws';
import fetch from 'node-fetch';

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
  }

  async start() {
    if (this.isRunning) {
      console.log('Monitor service is already running');
      return;
    }

    try {
      console.log('Starting NFT monitor service...');
      
      // Get all Fcked Catz NFTs from our database using symbol
      const client = await pool.connect();
      try {
        const result = await client.query(`
          SELECT mint_address, owner_wallet, owner_discord_id 
          FROM nft_metadata 
          WHERE symbol = 'FCKEDCATZ'
        `);
        
        console.log(`Found ${result.rows.length} Fcked Catz NFTs to monitor`);

        // Subscribe to account changes for each NFT
        for (const nft of result.rows) {
          await this.monitorNFT(nft.mint_address);
        }

        this.isRunning = true;
        console.log('NFT monitor service started successfully');

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error starting NFT monitor service:', error);
      throw error;
    }
  }

  async monitorNFT(mintAddress) {
    try {
      const mint = new PublicKey(mintAddress);
      
      // Get token account(s) for this mint
      const tokenAccounts = await this.connection.getTokenLargestAccounts(mint);
      
      // Monitor the token account that holds the NFT
      const tokenAccount = tokenAccounts.value[0];
      
      const subscriptionId = this.connection.onAccountChange(
        tokenAccount.address,
        async (accountInfo) => {
          await this.handleNFTUpdate(mintAddress, accountInfo);
        },
        'confirmed'
      );

      this.subscriptions.set(mintAddress, subscriptionId);
      console.log(`Monitoring started for NFT: ${mintAddress}`);

    } catch (error) {
      console.error(`Error setting up monitor for NFT ${mintAddress}:`, error);
    }
  }

  async handleNFTUpdate(mintAddress, accountInfo) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get current NFT data
      const currentData = await client.query(`
        SELECT owner_wallet, owner_discord_id, is_listed, list_price 
        FROM nft_metadata 
        WHERE mint_address = $1
      `, [mintAddress]);

      if (currentData.rows.length === 0) {
        console.log(`NFT ${mintAddress} not found in database`);
        await client.query('ROLLBACK');
        return;
      }

      const currentNFT = currentData.rows[0];

      // Parse token account data to get new owner
      const newOwner = this.parseTokenAccountData(accountInfo.data);

      if (newOwner !== currentNFT.owner_wallet) {
        // Update ownership in database
        await client.query(`
          UPDATE nft_metadata 
          SET owner_wallet = $1,
              owner_discord_id = NULL,
              owner_name = NULL,
              is_listed = false,
              list_price = NULL,
              last_updated = CURRENT_TIMESTAMP
          WHERE mint_address = $2
        `, [newOwner, mintAddress]);

        // Send Discord notification
        await this.sendDiscordNotification({
          type: 'transfer',
          mintAddress,
          oldOwner: currentNFT.owner_wallet,
          newOwner,
          wasListed: currentNFT.is_listed,
          listPrice: currentNFT.list_price
        });
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error handling NFT update:', error);
    } finally {
      client.release();
    }
  }

  parseTokenAccountData(data) {
    // Token Account data layout:
    // https://github.com/solana-labs/solana-program-library/blob/master/token/js/src/state/account.ts
    const dataLayout = {
      mint: 32,      // PublicKey
      owner: 32,     // PublicKey
      amount: 8,     // u64
      delegate: 32,  // PublicKey
      state: 1,      // AccountState
      isNative: 1,   // IsNative
      delegatedAmount: 8, // u64
      closeAuthority: 32  // PublicKey
    };
    
    // Owner address starts at byte 32 (after mint) and is 32 bytes long
    const ownerAddress = data.slice(32, 64);
    return new PublicKey(ownerAddress).toBase58();
  }

  async sendDiscordNotification(data) {
    if (!process.env.DISCORD_WEBHOOK_URL) {
      console.log('Discord webhook URL not configured');
      return;
    }

    try {
      const message = this.formatDiscordMessage(data);
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Error sending Discord notification:', error);
    }
  }

  async testWebhook() {
    console.log('Testing Discord webhook...');
    try {
      if (!process.env.DISCORD_WEBHOOK_URL) {
        throw new Error('Discord webhook URL not configured');
      }

      const testMessage = {
        embeds: [{
          title: '🔔 Fcked Catz Monitor - Test Message',
          description: 'If you can see this message, the webhook is working correctly!',
          fields: [
            { name: 'Collection', value: 'Fcked Catz', inline: true },
            { name: 'Status', value: 'Connected', inline: true },
            { name: 'Collection Address', value: 'EPeeeDr21EPJ4GJgjuRJ8SHD4A2d59erMaTtWaTT2hqm', inline: false }
          ],
          color: 0x00ff00,
          timestamp: new Date().toISOString()
        }]
      };

      console.log('Sending test message to Discord...');
      const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testMessage)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API error: ${response.status} - ${errorText}`);
      }

      console.log('Webhook test message sent successfully');
      return true;
    } catch (error) {
      console.error('Error testing webhook:', error);
      throw error;
    }
  }

  formatDiscordMessage(data) {
    if (data.type === 'transfer') {
      const oldOwnerShort = `${data.oldOwner.slice(0, 4)}...${data.oldOwner.slice(-4)}`;
      const newOwnerShort = `${data.newOwner.slice(0, 4)}...${data.newOwner.slice(-4)}`;
      const mintShort = `${data.mintAddress.slice(0, 4)}...${data.mintAddress.slice(-4)}`;

      return {
        embeds: [{
          title: '🐱 Fcked Cat Transfer Detected',
          description: data.wasListed 
            ? `NFT was purchased for ${data.listPrice} SOL`
            : 'NFT was transferred (not a marketplace sale)',
          fields: [
            { name: '🔑 Mint', value: `[\`${mintShort}\`](https://solscan.io/token/${data.mintAddress})`, inline: true },
            { name: '📤 From', value: `[\`${oldOwnerShort}\`](https://solscan.io/account/${data.oldOwner})`, inline: true },
            { name: '📥 To', value: `[\`${newOwnerShort}\`](https://solscan.io/account/${data.newOwner})`, inline: true }
          ],
          color: 0xFF4D4D, // Red to match Fcked Cat theme
          timestamp: new Date().toISOString(),
          footer: {
            text: 'BUXDAO NFT Monitor'
          }
        }]
      };
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('Stopping NFT monitor service...');
    
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
    this.isRunning = false;
    console.log('NFT monitor service stopped');
  }
}

export default NFTMonitorService; 