# BUXDAO NFT Website

Community-owned NFT collections on Solana blockchain with integrated merch store and rewards system.

## Features
- Real-time floor prices from Magic Eden
- Live SOL/USD conversion
- Collection statistics
- Direct links to marketplaces
- Holder verification system
- Discord role management
- Printful merch store integration
- Automated order fulfillment
- Real-time inventory sync
- Holder-exclusive products
- Daily rewards system

## Rewards System
The platform includes an automated rewards system that:
- Calculates daily rewards at 00:00 UTC
- Tracks NFT holdings across collections
- Manages reward distribution
- Processes claims through database
- Provides real-time balance updates

### Reward Rates
- Celeb Catz: 20 BUX/day
- Money Monsters 3D: 7 BUX/day
- Fcked Catz: 5 BUX/day
- Money Monsters: 5 BUX/day
- A.I. BitBots: 3 BUX/day
- AI Collabs: 1 BUX/day

Additional Bonuses:
- Money Monsters Top 10: +5 BUX/day
- Money Monsters 3D Top 10: +7 BUX/day
- Branded Catz: +5 BUX/day

## NFT Monitoring
- Real-time ownership tracking via WebSocket
- Automated holder verification
- Sales and listing notifications
- Periodic sync backup
- Discord integration for notifications

## Current Development Status
- Implementing real-time NFT ownership monitoring
- Claim system using database-driven rewards
- Daily rewards processed at 00:00 UTC
- Discord notifications for sales/listings

## Troubleshooting Setup Issues
### Solana BPF SDK Issues
- Initially encountered issues with the Solana BPF SDK due to Rust toolchain version incompatibilities.
- Recommended upgrading to Solana version 1.16 for better toolchain support.

## Holder Verification System
The platform includes an automated holder verification system that:
- Authenticates users via Discord OAuth
- Verifies NFT ownership through wallet connection
- Assigns appropriate Discord roles based on holdings
- Maintains user data in PostgreSQL database
- Provides holder-exclusive benefits
- Manages merch store discounts

### Database Schema
```sql
Table: holders
- wallet_address (primary key)
- discord_id
- discord_username
- last_verified
- holdings_count
- roles

Table: daily_rewards
- discord_id
- calculation_time
- reward_period_start
- reward_period_end
- collection specific counts and rewards
- total_daily_reward
- is_processed

Table: claim_accounts
- wallet_address (PK)
- discord_id
- unclaimed_amount
- total_claimed
- last_claim_time

Table: bux_holders
- wallet_address (PK)
- balance
- owner_discord_id
- last_updated

Table: nft_metadata
- mint_address (unique)
- name
- symbol
- owner_wallet
- owner_discord_id
- owner_name
- is_listed
- list_price
- last_sale_price
- marketplace
- last_updated

Table: collection_counts
- wallet_address (PK)
- discord_id
- collection specific counts
- total_count
- last_updated
```

### Authentication Flow
1. User connects Discord account (OAuth2)
2. User connects Solana wallet
3. System verifies NFT ownership
4. Database entry created/updated
5. Discord roles assigned based on holdings
6. Merch store access granted

## Development
- Frontend: React + Vite
- Backend: Edge Functions
- Database: PostgreSQL (Neon)
- Authentication: Discord OAuth2
- Blockchain: Solana Web3.js
- E-commerce: Printful API
- Caching: Node-Cache
- Session Management: Express Session

## Environment Setup
Required environment variables:
```env
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
POSTGRES_URL=
PRINTFUL_API_KEY=
SOLANA_RPC_URL=
SESSION_SECRET=
```

## Getting Started
1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Install Solana CLI v1.16.21
5. Run development server: `npm run start`

## Available Commands
- `npm start` - Start all services
- `npm run dev:vite` - Frontend only
- `npm run dev:server` - Backend only
- `npm run build` - Production build

## API Endpoints

### Authentication
- `/api/auth/discord` - Discord OAuth
- `/api/auth/wallet` - Wallet verification

### Collections
- `/api/collections` - Collection data
- `/api/collections/stats` - Real-time stats

### Merch Store
- `/api/printful/products` - Product catalog
- `/api/printful/webhook` - Order processing
- `/api/printful/sync` - Inventory sync

### Rewards
- `/api/user/rewards` - View rewards
- `/api/user/claim` - Claim rewards
- `/api/user/balance` - Check balance

## Deployment
- Edge Functions via Vercel
- Database on Neon
- Static assets on CDN
- Automated CI/CD pipeline
- Solana program on Mainnet 