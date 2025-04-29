import { Connection, PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
dotenv.config();

// Configuration
const RPC_ENDPOINT = 'https://thrilling-purple-replica.solana-mainnet.quiknode.pro/628d12e42a5508dc3c9cec8fd7b3f120a03449f7/';
const DB_CONNECTION_STRING = 'postgresql://neondb_owner:ENy3VObxHTd4@ep-dry-dawn-a5hld2w4-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

interface TokenHolder {
    address: string;
    balance: number;
    rawBalance: string;
}

interface DbHolder {
    wallet_address: string;
    balance: number;
    owner_discord_id: string | null;
    owner_name: string | null;
    last_updated: Date;
    is_exempt: boolean;
}

async function getTokenHolders(connection: Connection, mintAddress: string): Promise<TokenHolder[]> {
    console.log(`Fetching token holders for mint: ${mintAddress}`);
    
    const mint = new PublicKey(mintAddress);
    
    // Get mint info to get decimals
    const mintInfo = await connection.getParsedAccountInfo(mint);
    const decimals = (mintInfo.value?.data as any)?.parsed.info.decimals || 9;
    console.log(`Token decimals: ${decimals}`);
    
    // Get all token accounts for this mint
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
            {
                dataSize: 165, // Size of token account
            },
            {
                memcmp: {
                    offset: 0,
                    bytes: mint.toBase58(),
                },
            },
        ],
    });
    
    console.log(`Found ${accounts.length} total token accounts`);
    
    // Process accounts and filter out zero balances
    const holders: TokenHolder[] = accounts
        .map(account => {
            const data = account.account.data;
            const balance = data.readBigUInt64LE(64);
            const owner = new PublicKey(data.slice(32, 64));
            
            return {
                address: owner.toBase58(),
                balance: Number(balance) / Math.pow(10, decimals),
                rawBalance: balance.toString()
            };
        })
        .filter(holder => holder.balance > 0)
        .sort((a, b) => b.balance - a.balance); // Sort by balance descending
    
    console.log(`Found ${holders.length} holders with non-zero balance`);
    
    // Calculate total supply
    const totalSupply = holders.reduce((sum, holder) => sum + holder.balance, 0);
    console.log(`Total supply: ${totalSupply}`);
    
    return holders;
}

async function getDbHolders(pool: Pool): Promise<DbHolder[]> {
    const result = await pool.query('SELECT * FROM bux_holders');
    return result.rows;
}

async function syncDatabase() {
    // Initialize connection to Solana
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    
    // Initialize connection to PostgreSQL
    const pool = new Pool({
        connectionString: DB_CONNECTION_STRING
    });
    
    try {
        // Load the token mint address
        const { mint: newMintAddress } = JSON.parse(fs.readFileSync('new_token_info.json', 'utf-8'));
        
        // Get current token holders from blockchain
        const currentHolders = await getTokenHolders(connection, newMintAddress);
        
        // Get current holders from database
        const dbHolders = await getDbHolders(pool);
        
        console.log(`Database has ${dbHolders.length} holders`);
        
        // Create maps for easier lookup
        const currentHoldersMap = new Map(currentHolders.map(h => [h.address, h]));
        const dbHoldersMap = new Map(dbHolders.map(h => [h.wallet_address, h]));
        
        // Track changes
        const toInsert: TokenHolder[] = [];
        const toUpdate: { address: string, balance: number }[] = [];
        const toDelete: string[] = [];
        
        // Find holders to insert or update
        for (const holder of currentHolders) {
            const dbHolder = dbHoldersMap.get(holder.address);
            
            if (!dbHolder) {
                // New holder, needs to be inserted
                toInsert.push(holder);
            } else if (Math.abs(dbHolder.balance - holder.balance) > 0.000001) {
                // Existing holder with different balance, needs to be updated
                toUpdate.push({ address: holder.address, balance: holder.balance });
            }
            
            // Remove from map to track which ones are left
            dbHoldersMap.delete(holder.address);
        }
        
        // Remaining holders in dbHoldersMap are not in current holders, should be deleted
        toDelete.push(...Array.from(dbHoldersMap.keys()));
        
        console.log(`Changes to make: ${toInsert.length} inserts, ${toUpdate.length} updates, ${toDelete.length} deletes`);
        
        // Apply changes to database
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Insert new holders
            for (const holder of toInsert) {
                await client.query(
                    'INSERT INTO bux_holders (wallet_address, balance, last_updated) VALUES ($1, $2, CURRENT_TIMESTAMP)',
                    [holder.address, holder.balance]
                );
            }
            
            // Update existing holders
            for (const update of toUpdate) {
                await client.query(
                    'UPDATE bux_holders SET balance = $1, last_updated = CURRENT_TIMESTAMP WHERE wallet_address = $2',
                    [update.balance, update.address]
                );
            }
            
            // Delete holders that no longer exist
            if (toDelete.length > 0) {
                await client.query(
                    'DELETE FROM bux_holders WHERE wallet_address = ANY($1)',
                    [toDelete]
                );
            }
            
            await client.query('COMMIT');
            console.log('Database sync completed successfully');
            
            // Save current holders to file for reference
            fs.writeFileSync('current_holders.json', JSON.stringify(currentHolders, null, 2));
            console.log('Saved current holders to current_holders.json');
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error syncing database:', error);
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error in sync process:', error);
    } finally {
        // Close the pool
        await pool.end();
    }
}

// Run the sync
syncDatabase().catch(console.error); 