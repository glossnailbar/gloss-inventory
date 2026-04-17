-- Migration: Add is_retail column to products table
-- This column was added to local schema but missing on Railway

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_retail BOOLEAN DEFAULT FALSE;
