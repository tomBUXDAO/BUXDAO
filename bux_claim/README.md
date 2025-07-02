# BUX Claim Solana Program

This is a Solana program that handles BUX token claims using a treasury PDA (Program Derived Address) for secure token transfers.

## Features

- Secure token transfers using PDA authority
- No backend private key exposure
- Phantom wallet compatible
- Proper transaction signing by user wallet

## Prerequisites

1. **Solana CLI** (version 1.16.21 or later)
2. **Node.js** (version 18 or later)
3. **Yarn** package manager
4. **Solana wallet** with SOL for deployment

## Setup

1. **Install dependencies:**
   ```bash
   cd bux_claim
   yarn install
   ```

2. **Configure Solana CLI:**
   ```bash
   # Set to devnet for testing
   solana config set --url devnet
   
   # Or set to mainnet-beta for production
   solana config set --url mainnet-beta
   ```

3. **Check your wallet:**
   ```bash
   solana address
   solana balance
   ```

## Deployment

### 1. Build the Program
```bash
anchor build
```

### 2. Deploy to Devnet (for testing)
```bash
# Deploy using Anchor
anchor deploy --provider.cluster devnet

# Or use the custom deployment script
node deploy.js
```

### 3. Update Program ID
After deployment, update the program ID in:
- `Anchor.toml` (programs section)
- `src/utils/claimProgram.js` (PROGRAM_ID constant)
- `src/idl/bux_claim.json` (if needed)

### 4. Generate IDL
```bash
anchor idl init --filepath target/idl/bux_claim.json <PROGRAM_ID>
```

## Configuration

### Treasury Setup

1. **Create Treasury PDA:**
   ```javascript
   const [treasuryAuthority] = PublicKey.findProgramAddressSync(
     [Buffer.from('treasury')],
     programId
   );
   ```

2. **Create Treasury Token Account:**
   ```javascript
   const treasuryTokenAccount = await getAssociatedTokenAddress(
     BUX_TOKEN_MINT,
     treasuryAuthority,
     true // allowOwnerOffCurve
   );
   ```

3. **Fund Treasury:**
   Transfer BUX tokens to the treasury token account.

### Frontend Integration

1. **Update Constants:**
   - Set `BUX_TOKEN_MINT` to your actual BUX token mint address
   - Set `PROGRAM_ID` to your deployed program ID
   - Set `treasuryTokenAccount` to your treasury token account address

2. **Install Dependencies:**
   ```bash
   npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
   ```

## Testing

### Run Tests
```bash
anchor test
```

### Test on Devnet
1. Deploy to devnet
2. Create test treasury and token accounts
3. Run integration tests

## Security Considerations

- ✅ Treasury authority is a PDA (no private key)
- ✅ User signs their own transactions
- ✅ No backend private key exposure
- ✅ Phantom wallet compatible
- ⚠️ Treasury must be funded before claims
- ⚠️ Program ID must be verified on frontend

## Cost Estimation

### Devnet Deployment
- Program deployment: ~2-3 SOL (refundable on devnet)
- Treasury setup: ~0.01 SOL
- Transaction fees: ~0.000005 SOL per claim

### Mainnet Deployment
- Program deployment: ~2-3 SOL (one-time cost)
- Treasury setup: ~0.01 SOL
- Transaction fees: ~0.000005 SOL per claim

## Troubleshooting

### Common Issues

1. **Build Errors:**
   - Check Solana CLI version
   - Update Anchor dependencies
   - Clear target directory: `rm -rf target/`

2. **Deployment Errors:**
   - Ensure sufficient SOL balance
   - Check network configuration
   - Verify wallet keypair

3. **Transaction Errors:**
   - Verify treasury is funded
   - Check token account addresses
   - Ensure proper PDA derivation

### Error Messages

- `"Insufficient funds"` - Treasury needs more BUX tokens
- `"Invalid account"` - Check token account addresses
- `"Invalid authority"` - Verify PDA derivation

## Production Checklist

- [ ] Deploy to mainnet-beta
- [ ] Verify program ID on Solana Explorer
- [ ] Set up treasury with sufficient funds
- [ ] Test with small amounts first
- [ ] Monitor transaction logs
- [ ] Set up error monitoring
- [ ] Document treasury management procedures

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Solana/Anchor documentation
3. Check transaction logs on Solana Explorer
4. Verify all configuration values 