import('./sync-nft-ownership.js')
  .then(mod => mod.default())
  .catch(err => {
    console.error(err);
    process.exit(1);
  }); 