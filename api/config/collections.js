// Collection configurations
export const COLLECTIONS = {
  // Main Collections
  'FCKEDCATZ': {
    name: 'Fcked Catz',
    symbol: 'FCKEDCATZ',
    meSlug: 'fcked_catz',
    hasRarity: true,
    logo: '/logos/cat.PNG',
    color: 0xFFF44D, // Yellow
    rewardRate: 5 // BUX per day
  },
  'MM': {
    name: 'Money Monsters',
    symbol: 'MM',
    meSlug: 'money_monsters',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFFFF, // Cyan
    rewardRate: 5 // BUX per day
  },
  'AIBB': {
    name: 'A.I. BitBots',
    symbol: 'AIBB',
    meSlug: 'ai_bitbots',
    hasRarity: true,
    logo: '/logos/bitbot.PNG',
    color: 0xFF4D4D, // Red
    rewardRate: 3 // BUX per day
  },
  'MM3D': {
    name: 'Money Monsters 3D',
    symbol: 'MM3D',
    meSlug: 'moneymonsters3d',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFF4D, // Green
    rewardRate: 7 // BUX per day
  },
  'CELEBCATZ': {
    name: 'Celebrity Catz',
    symbol: 'CELEBCATZ',
    meSlug: 'celebcatz',
    hasRarity: false,
    logo: '/logos/cat.PNG',
    color: 0xFF4DFF, // Purple
    rewardRate: 20 // BUX per day
  },

  // Collab Collections
  'SHXBB': {
    name: 'A.I. Warriors',
    symbol: 'SHXBB',
    meSlug: 'ai_warriors',
    hasRarity: false,
    logo: '/logos/bitbot.PNG',
    color: 0x4D4DFF, // Blue
    rewardRate: 1 // BUX per day
  },
  'AUSQRL': {
    name: 'A.I. Secret Squirrels',
    symbol: 'AUSQRL',
    meSlug: 'ai_secret_squirrels',
    hasRarity: false,
    logo: '/logos/squirrel.PNG',
    color: 0xFFA54D, // Orange
    rewardRate: 1 // BUX per day
  },
  'AELXAIBB': {
    name: 'A.I. Energy Apes',
    symbol: 'AELXAIBB',
    meSlug: 'ai_energy_apes',
    hasRarity: false,
    logo: '/logos/bitbot.PNG',
    color: 0x4DFFA5, // Teal
    rewardRate: 1 // BUX per day
  },
  'AIRB': {
    name: 'Rejected Bots',
    symbol: 'AIRB',
    meSlug: 'rejected_bots_ryc',
    hasRarity: false,
    logo: '/logos/bitbot.PNG',
    color: 0xFF4D4D, // Red
    rewardRate: 1 // BUX per day
  },
  'CLB': {
    name: 'CandyBots',
    symbol: 'CLB',
    meSlug: 'candybots',
    hasRarity: false,
    logo: '/logos/bitbot.PNG',
    color: 0xFF4DFF, // Pink
    rewardRate: 1 // BUX per day
  },
  'DDBOT': {
    name: 'DoodleBots',
    symbol: 'DDBOT',
    meSlug: 'doodlebots',
    hasRarity: false,
    logo: '/logos/bitbot.PNG',
    color: 0x4DFF4D, // Green
    rewardRate: 1 // BUX per day
  }
};

// Collection addresses for on-chain verification
export const COLLECTION_ADDRESSES = {
  'FCKEDCATZ': 'FCKEDcaTZZxf6c3tF3JYb7PhBZzXhQwEBDuSP6GSi9Q',
  'MM': 'MMNFTxVtpK2u7PRqRLBf1GDgKYKQg5PpJV1F2ppKxfd',
  'AIBB': 'AiBiTboTxPRL9knyTKZBEJsNAoXvxjpZwYYpZHzYB5Y',
  'MM3D': 'MM3DxqWxszLFGQBwjKCQAAGbQHPRJN3UydswgGrWiPZ',
  'CELEBCATZ': 'CCATZxVtpK2u7PRqRLBf1GDgKYKQg5PpJV1F2ppKxfd'
};

// Database column mappings for collection counts
export const COLLECTION_COUNT_COLUMNS = {
  'FCKEDCATZ': 'fcked_catz_count',
  'MM': 'money_monsters_count',
  'AIBB': 'ai_bitbots_count',
  'MM3D': 'money_monsters_3d_count',
  'CELEBCATZ': 'celeb_catz_count',
  'SHXBB': 'ai_warriors_count',
  'AUSQRL': 'ai_secret_squirrels_count',
  'AELXAIBB': 'ai_energy_apes_count',
  'AIRB': 'rejected_bots_count',
  'CLB': 'candybots_count',
  'DDBOT': 'doodlebots_count'
};

// Helper functions
export function getCollectionBySymbol(symbol) {
  return COLLECTIONS[symbol?.toUpperCase()];
}

export function getCollectionByMESlug(slug) {
  return Object.values(COLLECTIONS).find(c => c.meSlug === slug);
}

export function getCollectionByAddress(address) {
  const symbol = Object.entries(COLLECTION_ADDRESSES).find(([_, addr]) => addr === address)?.[0];
  return symbol ? COLLECTIONS[symbol] : null;
}

export function getCollectionCountColumn(symbol) {
  return COLLECTION_COUNT_COLUMNS[symbol?.toUpperCase()];
}

export function getAllCollectionSymbols() {
  return Object.keys(COLLECTIONS);
}

export function getMainCollectionSymbols() {
  return Object.entries(COLLECTIONS)
    .filter(([_, config]) => config.rewardRate >= 3)
    .map(([symbol]) => symbol);
}

export function getCollabCollectionSymbols() {
  return Object.entries(COLLECTIONS)
    .filter(([_, config]) => config.rewardRate === 1)
    .map(([symbol]) => symbol);
} 