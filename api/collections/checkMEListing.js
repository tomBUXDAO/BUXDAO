export async function checkMEListing(mintAddress) {
  try {
    // First get the collection info to get the total supply
    const collectionInfo = await getCollectionInfo(mintAddress);
    if (!collectionInfo) {
      console.error('Failed to get collection info');
      return null;
    }

    const totalSupply = collectionInfo.totalSupply;
    console.log(`Total supply for collection: ${totalSupply}`);

    // Fetch all NFTs in batches of 1000
    const allNFTs = [];
    let before = null;
    const batchSize = 1000;

    while (allNFTs.length < totalSupply) {
      const response = await fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAssetsByGroup',
          params: {
            groupKey: 'collection',
            groupValue: mintAddress,
            page: 1
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.result || !data.result.items) {
        console.error('Invalid response format:', data);
        break;
      }

      const nfts = data.result.items;
      allNFTs.push(...nfts);
      console.log(`Fetched ${nfts.length} NFTs in current batch. Total fetched: ${allNFTs.length}`);

      // Check if we've reached the end
      if (nfts.length < batchSize) {
        break;
      }

      // Set the before parameter for the next batch
      before = nfts[nfts.length - 1].id;
    }

    console.log(`Total NFTs fetched: ${allNFTs.length}`);

    // Get Magic Eden listings
    const meResponse = await fetch(`https://api-mainnet.magiceden.dev/v2/collections/${mintAddress}/listings?offset=0&limit=1000`);
    if (!meResponse.ok) {
      throw new Error(`Magic Eden API error! status: ${meResponse.status}`);
    }
    const meListings = await meResponse.json();
    console.log(`Magic Eden listings fetched: ${meListings.length}`);

    // Create a map of Magic Eden listings for quick lookup
    const meListingsMap = new Map(meListings.map(listing => [listing.tokenMint, listing]));

    // Process all NFTs
    const processedNFTs = allNFTs.map(nft => {
      const meListing = meListingsMap.get(nft.id);
      return {
        mint: nft.id,
        name: nft.content.metadata.name,
        isListed: !!meListing,
        listPrice: meListing ? meListing.price : null,
        lastSalePrice: nft.content.metadata.attributes?.find(attr => attr.trait_type === 'Last Sale Price')?.value || null,
        marketplace: meListing ? 'Magic Eden' : null,
        lastUpdated: new Date().toISOString()
      };
    });

    // Update database with all NFTs
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing entries for this collection
      await client.query('DELETE FROM nft_metadata WHERE mint_address IN (SELECT mint_address FROM nft_metadata WHERE mint_address = $1)', [mintAddress]);

      // Insert all NFTs
      const insertPromises = processedNFTs.map(nft => 
        client.query(
          'INSERT INTO nft_metadata (mint_address, name, owner_wallet, is_listed, list_price, last_sale_price, marketplace, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [nft.mint, nft.name, nft.owner, nft.isListed, nft.listPrice, nft.lastSalePrice, nft.marketplace, nft.lastUpdated]
        )
      );

      await Promise.all(insertPromises);
      await client.query('COMMIT');
      console.log(`Successfully updated database with ${processedNFTs.length} NFTs`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database update failed:', error);
      throw error;
    } finally {
      client.release();
    }

    return {
      totalNFTs: processedNFTs.length,
      listedNFTs: processedNFTs.filter(nft => nft.isListed).length,
      listings: processedNFTs.filter(nft => nft.isListed)
    };
  } catch (error) {
    console.error('Error in checkMEListing:', error);
    return null;
  }
} 