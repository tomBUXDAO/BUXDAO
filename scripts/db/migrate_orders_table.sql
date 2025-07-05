-- Migration script to add printful_order_id column to orders table
-- Run this if the column doesn't exist yet

DO $$ 
BEGIN
    -- Check if the column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'printful_order_id'
    ) THEN
        -- Add the column
        ALTER TABLE orders ADD COLUMN printful_order_id INTEGER;
        RAISE NOTICE 'Added printful_order_id column to orders table';
    ELSE
        RAISE NOTICE 'printful_order_id column already exists in orders table';
    END IF;
END $$; 