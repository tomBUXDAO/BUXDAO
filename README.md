# BUXDAO NFT Website

Community-owned NFT collections on Solana blockchain with integrated merch store and token exchange system.

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
- BUX token exchange system

## BUX Exchange Program
The platform includes an on-chain BUX token exchange program that:
- Handles token claims for NFT holders
- Manages treasury transfers
- Uses Program Derived Addresses (PDAs)
- Implements secure token transfers
- Program ID: 5FmuPcTCJSxB4gJhYpKMZDMgbZAhNezHVWML6htJNXrX

### Current Development Status
- Basic program structure implemented
- Claim functionality coded
- Build environment setup pending
- Requires macOS Monterey for toolchain
- Testing and deployment to follow

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
- Smart Contracts: Anchor Framework
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
5. Install Anchor Framework v0.28.0
6. Run development server: `npm run start`

## Available Commands
- `npm start` - Start all services
- `npm run dev:vite` - Frontend only
- `npm run dev:server` - Backend only
- `npm run build` - Production build
- `anchor build` - Build Solana program
- `anchor deploy` - Deploy Solana program

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

### Token Exchange
- `/api/user/claim` - Token claim requests
- `/api/user/balance` - User BUX balance
- `/api/user/claim/confirm` - Confirm token claims

## Deployment
- Edge Functions via Vercel
- Database on Neon
- Static assets on CDN
- Automated CI/CD pipeline
- Solana program on Mainnet 