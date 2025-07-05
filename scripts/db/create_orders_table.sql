CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(64) NOT NULL,
    tx_signature VARCHAR(128) NOT NULL,
    cart JSONB NOT NULL,
    shipping_info JSONB NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'processing',
    printful_order_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
); 