# Printful Integration Documentation

## Overview

The BUXDAO merch store integrates with Printful to automatically create orders when users pay with USDC. This integration handles:

- Product catalog synchronization
- Automatic order creation after payment verification
- Order status tracking
- Email confirmations

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
PRINTFUL_API_KEY=your_printful_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
PROJECT_WALLET=your_project_wallet_address
ADMIN_EMAIL=admin@buxdao.com
```

### Database Setup

Run the migration script to add the `printful_order_id` column:

```sql
-- Run this SQL script
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'printful_order_id'
    ) THEN
        ALTER TABLE orders ADD COLUMN printful_order_id INTEGER;
    END IF;
END $$;
```

## API Endpoints

### POST /api/printful/order

Creates a new order after USDC payment verification.

**Request Body:**
```json
{
  "shippingInfo": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "address1": "123 Main St",
    "address2": "Apt 4B",
    "city": "Los Angeles",
    "state": "CA",
    "country": "United States",
    "postalCode": "90210",
    "phone": "+1234567890"
  },
  "cart": [
    {
      "id": 123,
      "name": "BUXDAO T-Shirt",
      "size": "L",
      "color": "Black",
      "quantity": 2,
      "price": 25.00,
      "sync_variant_id": 456789
    }
  ],
  "txSignature": "transaction_signature_here",
  "email": "customer@example.com",
  "wallet_address": "customer_wallet_address"
}
```

**Response:**
```json
{
  "success": true,
  "order_id": 1,
  "printful_order_id": 12345,
  "message": "Order created successfully"
}
```

### GET /api/printful/order/:wallet_address

Retrieves all orders for a specific wallet address.

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "id": 1,
      "wallet_address": "customer_wallet",
      "tx_signature": "tx_sig",
      "cart": [...],
      "shipping_info": {...},
      "status": "processing",
      "printful_order_id": 12345,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/printful/order/status/:order_id

Gets detailed order status including Printful information.

**Response:**
```json
{
  "success": true,
  "order": {
    "id": 1,
    "status": "processing",
    "printful_order_id": 12345,
    "printful_status": "draft",
    "printful_details": {
      "id": 12345,
      "status": "draft",
      "shipping": "STANDARD",
      "recipient": {...},
      "items": [...]
    }
  }
}
```

## Order Flow

1. **User adds items to cart** - Items are stored with `sync_variant_id` for Printful
2. **User fills shipping form** - Form validation ensures all required fields
3. **User clicks checkout** - USDC payment transaction is initiated
4. **Payment verification** - Backend validates the Solana transaction
5. **Printful order creation** - Order is automatically created in Printful
6. **Database storage** - Order details stored in local database
7. **Email confirmation** - Customer receives order confirmation email
8. **Order tracking** - Customer can view order status

## Error Handling

### Printful API Errors

If Printful order creation fails:
- Order is still stored in database with status `pending_printful`
- Customer still receives confirmation email
- Admin is notified via BCC email
- Manual intervention may be required

### Payment Verification Errors

- Insufficient USDC payment
- Transaction not found
- Invalid transaction signature
- Wrong recipient wallet

### Database Errors

- Connection pool exhaustion
- Transaction rollback on errors
- Proper client release in finally blocks

## Testing

### Test Printful Connection

Run the test script to verify API connectivity:

```bash
node scripts/test-printful.js
```

This will test:
- Products API access
- Shipping rates calculation
- Order creation (draft mode)
- Order cleanup

### Test Order Creation

1. Add items to cart in the frontend
2. Fill shipping form
3. Complete USDC payment
4. Check database for order entry
5. Verify Printful order creation
6. Check email delivery

## Troubleshooting

### Common Issues

1. **"No variant ID found" error**
   - Ensure cart items include `sync_variant_id` or `variant_id`
   - Check that product variants are properly loaded

2. **Printful API authentication errors**
   - Verify `PRINTFUL_API_KEY` is correct
   - Check API key permissions in Printful dashboard

3. **Order creation fails but payment succeeds**
   - Check Printful API logs
   - Verify shipping address format
   - Check variant availability in Printful

4. **Email delivery issues**
   - Verify SendGrid API key
   - Check email address format
   - Review SendGrid delivery logs

### Debug Mode

Enable detailed logging by setting:

```bash
DEBUG=printful:*
```

This will log:
- API request/response details
- Order creation steps
- Error details with stack traces

## Security Considerations

- All API keys stored in environment variables
- USDC payment verification before order creation
- Transaction signature validation
- Input sanitization for shipping data
- Rate limiting on API endpoints

## Monitoring

### Key Metrics to Track

- Order creation success rate
- Printful API response times
- Payment verification failures
- Email delivery rates
- Database connection pool usage

### Logs to Monitor

- Printful API errors
- Payment verification failures
- Database transaction errors
- Email sending failures

## Future Enhancements

- Webhook integration for order status updates
- Automated order fulfillment
- Inventory synchronization
- Multi-currency support
- Advanced shipping options 