const { Connection, PublicKey } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
require('dotenv').config();
const { Pool } = require('pg');

// Configuration
const RPC_ENDPOINT = process.env.QUICKNODE_RPC_URL;
const DB_CONNECTION_STRING = process.env.POSTGRES_URL;

async function getTokenHolders(connection, mintAddress) {
    console.log(`Fetching token holders for mint: ${mintAddress}`);
    const mint = new PublicKey(mintAddress);
    // Get mint info to get decimals
    const mintInfo = await connection.getParsedAccountInfo(mint);
    const decimals = (mintInfo.value?.data)?.parsed.info.decimals || 9;
    // Get all token accounts for this mint
    const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
        filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: mint.toBase58() } },
        ],
    });
    // Process accounts and filter out zero balances
    const holders = accounts
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
        .sort((a, b) => b.balance - a.balance);
    console.log(`Found ${holders.length} holders with non-zero balance`);
    const totalSupply = holders.reduce((sum, holder) => sum + holder.balance, 0);
    console.log(`Total supply: ${totalSupply}`);
    return holders;
}

async function getDbHolders(pool) {
    const result = await pool.query('SELECT * FROM bux_holders');
    return result.rows;
}

async function syncDatabase() {
    const connection = new Connection(RPC_ENDPOINT, 'confirmed');
    const pool = new Pool({ connectionString: DB_CONNECTION_STRING });
    try {
        // Load the token mint address
        const newMintAddress = process.env.BUX_TOKEN_MINT_ADDRESS;
        if (!newMintAddress) throw new Error('BUX_TOKEN_MINT_ADDRESS not set');
        // Get current token holders from blockchain
        const currentHolders = await getTokenHolders(connection, newMintAddress);
        // Get current holders from database
        const dbHolders = await getDbHolders(pool);
        console.log(`Database has ${dbHolders.length} holders`);
        // Create maps for easier lookup
        const currentHoldersMap = new Map(currentHolders.map(h => [h.address, h]));
        const dbHoldersMap = new Map(dbHolders.map(h => [h.wallet_address, h]));
        // Track changes
        const toInsert = [];
        const toUpdate = [];
        const toDelete = [];
        // Find holders to insert or update
        for (const holder of currentHolders) {
            const dbHolder = dbHoldersMap.get(holder.address);
            if (!dbHolder) {
                toInsert.push(holder);
            } else if (Math.abs(dbHolder.balance - holder.balance) > 0.000001) {
                toUpdate.push({ address: holder.address, balance: holder.balance });
            }
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
        await pool.end();
    }
}

// Run the sync
syncDatabase().catch(console.error); 