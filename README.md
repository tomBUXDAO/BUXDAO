# BUXDAO NFT Website

Community-owned NFT collections on Solana blockchain.

## Features
- Real-time floor prices from Magic Eden
- Live SOL/USD conversion
- Collection statistics
- Direct links to marketplaces
- Holder verification system
- Discord role management

## Holder Verification System
The platform includes an automated holder verification system that:
- Authenticates users via Discord OAuth
- Verifies NFT ownership through wallet connection
- Assigns appropriate Discord roles based on holdings
- Maintains user data in PostgreSQL database

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

## Development
- Frontend: React + Vite
- Backend: Edge Functions
- Database: PostgreSQL (Neon)
- Authentication: Discord OAuth2
- Blockchain: Solana Web3.js

## Environment Setup
Required environment variables:
```env
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_BOT_TOKEN=
POSTGRES_URL=
PRINTFUL_API_KEY=
```

## Getting Started
1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Run development server: `npm run start` 