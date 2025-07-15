import fs from 'fs';
import path from 'path';

// List of all sync scripts to update (excluding fckedcatz which is already updated)
const syncScripts = [
  'sync-celebcatz.js',
  'sync-monsters.js', 
  'sync-mm3d.js',
  'sync-aibitbots.js',
  'sync-aelxaibb.js',
  'sync-airb.js',
  'sync-ausqrl.js',
  'sync-ddbot.js',
  'sync-clb.js'
];

// The improved determineOwnershipChange function
const improvedDetermineOwnershipChange = `// Improved function to determine ownership change type by always fetching transaction details
async function determineOwnershipChange(mintAddress, oldOwner, newOwner) {
  try {
    console.log(\`\\nAnalyzing ownership change for \${mintAddress}:\`);
    console.log(\`- Old owner: \${oldOwner}\`);
    console.log(\`- New owner: \${newOwner}\`);
    
    // Check if the NFT was burned (no owner)
    if (!newOwner) {
      console.log(\`\\n🔥 NFT Burned: \${mintAddress}\`);
      return { 
        type: 'burned',
        details: {
          previous_owner: oldOwner,
          timestamp: new Date().toISOString()
        }
      };
    }
    
    // Always fetch recent transaction history for this NFT
    console.log(\`Fetching transaction history for \${mintAddress}...\`);
    
    const response = await fetch(
      \`https://api.helius.xyz/v0/addresses/\${mintAddress}/transactions?api-key=\${process.env.HELIUS_API_KEY}\`
    );
    
    if (!response.ok) {
      console.error(\`Failed to fetch transaction history: \${response.statusText}\`);
      return { type: 'unknown' };
    }
    
    const transactions = await response.json();
    console.log(\`Found \${transactions.length} transactions\`);
    
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
      console.log(\`\\nAnalyzing transaction: \${tx.signature}\`);
      console.log(\`- Type: \${tx.type}\`);
      console.log(\`- Description: \${tx.description}\`);
      
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
        console.log(\`- NFT Event:\`, nftEvent);
        
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
        console.log(\`- Checking description: \${description}\`);
        
        // Collection offer accepted
        if (description.includes('collection offer') || description.includes('bid accepted')) {
          transactionType = 'sale';
          // Try to extract price from description
          const priceMatch = tx.description.match(/(\\d+\\.?\\d*)\\s*sol/i);
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
          const priceMatch = tx.description.match(/(\\d+\\.?\\d*)\\s*sol/i);
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
          console.log(\`- Found price from token transfer: \${price} SOL\`);
        }
      }
      
      // If we found a relevant transaction, return the result
      if (involvesOwnershipChange) {
        console.log(\`\\n✅ Detected transaction type: \${transactionType}\`);
        
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
    console.log(\`\\n⚠️ No specific transaction type detected - treating as transfer\`);
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
}`;

// The improved main sync logic
const improvedMainSyncLogic = `      // Check for ownership changes - use improved transaction analysis for ALL changes
      if (dbNFT.owner_wallet !== nft.ownership.owner) {
        console.log(\`\\n🔍 Ownership change detected for \${nft.id}:\`);
        console.log(\`- Previous owner: \${dbNFT.owner_wallet}\`);
        console.log(\`- New owner: \${nft.ownership.owner}\`);
        
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
          console.log(\`⚠️ Unknown change type: \${change.type}\`);
        }
        
        if (TEST_MODE) {
          console.log(\`\\nTest Mode: Ownership Change Detected:\`, {
            mint: nft.id,
            name: nft.content.metadata.name,
            type: change.type,
            previous_owner: dbNFT.owner_wallet,
            new_owner: nft.ownership.owner,
            details: change.details
          });
        } else {
          await handleOwnershipChange(client, nft, dbNFT, change);
        }`;

// The improved burn handling in handleOwnershipChange
const improvedBurnHandling = `    } else if (change.type === 'burned') {
      // Handle burn event
      console.log(\`\\n🔥 NFT Burned: \${nft.id}\`);
      
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
        \`DELETE FROM nft_metadata WHERE mint_address = $1\`,
        [nft.id]
      );
      
      return; // Exit early since NFT is deleted
    }`;

// The improved burn notification in missing NFT check
const improvedBurnNotification = `            if (nftStatus.result?.burnt === true) {
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
              
              await sendActivityNotification(message);`;

async function updateScript(scriptPath) {
  console.log(`Updating ${scriptPath}...`);
  
  let content = fs.readFileSync(scriptPath, 'utf8');
  
  // Replace the determineOwnershipChange function
  const oldDetermineOwnershipChangeRegex = /\/\/ Function to determine the type of ownership change[\s\S]*?} catch \(error\) \{[\s\S]*?return \{ type: 'unknown' \};[\s\S]*?}/;
  content = content.replace(oldDetermineOwnershipChangeRegex, improvedDetermineOwnershipChange);
  
  // Replace the main sync logic
  const oldMainSyncLogicRegex = /\/\/ Check for ownership changes[\s\S]*?} else \{[\s\S]*?await handleOwnershipChange\(client, nft, dbNFT, change\);[\s\S]*?}/;
  content = content.replace(oldMainSyncLogicRegex, improvedMainSyncLogic);
  
  // Replace burn handling in handleOwnershipChange
  const oldBurnHandlingRegex = /} else if \(change\.type === 'transferred' \|\| change\.type === 'transfer'\) \{[\s\S]*?WHERE mint_address = \$3\`,[\s\S]*?\[nft\.ownership\.owner, newOwnerDiscord, nft\.id\]\)[\s\S]*?}/;
  content = content.replace(oldBurnHandlingRegex, \`} else if (change.type === 'transferred' || change.type === 'transfer') {
      await client.query(
        \`UPDATE nft_metadata 
        SET owner_wallet = $1,
            owner_discord_id = $2
        WHERE mint_address = $3\`,
        [nft.ownership.owner, newOwnerDiscord, nft.id]
      );
    \${improvedBurnHandling}`);
  
  // Replace burn notification in missing NFT check
  const oldBurnNotificationRegex = /if \(nftStatus\.result\?\.burnt === true\) \{[\s\S]*?await sendActivityNotification\(\{[\s\S]*?type: 'burned',[\s\S]*?nft: \{[\s\S]*?mint_address: dbNFT\.mint_address,[\s\S]*?name: dbNFT\.name,[\s\S]*?symbol: dbNFT\.symbol,[\s\S]*?owner_wallet: dbNFT\.owner_wallet,[\s\S]*?original_lister: dbNFT\.original_lister,[\s\S]*?rarity_rank: dbNFT\.rarity_rank,[\s\S]*?image_url: dbNFT\.image_url[\s\S]*?\}[\s\S]*?\}\);/;
  content = content.replace(oldBurnNotificationRegex, improvedBurnNotification);
  
  // Write the updated content back to the file
  fs.writeFileSync(scriptPath, content, 'utf8');
  console.log(`✅ Updated ${scriptPath}`);
}

async function updateAllScripts() {
  console.log('Starting batch update of all sync scripts...');
  
  for (const script of syncScripts) {
    try {
      await updateScript(script);
    } catch (error) {
      console.error(`❌ Error updating ${script}:`, error.message);
    }
  }
  
  console.log('\\n🎉 Batch update completed!');
}

updateAllScripts().catch(console.error); 