-- Migration: Add missing columns to products table
-- These columns exist in local schema but missing on Railway

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_retail BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_backbar BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS purchase_link TEXT,
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
