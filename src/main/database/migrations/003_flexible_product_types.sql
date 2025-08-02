-- Migration 003: Make product types flexible
-- Removes hardcoded product type constraints to allow any HVAC equipment type

-- SQLite doesn't support ALTER TABLE DROP CONSTRAINT directly
-- We need to recreate the table without the constraint

-- Create new table without type constraint
CREATE TABLE products_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL,  -- Removed CHECK constraint - now accepts any string
  tonnage REAL,
  seer REAL,
  seer2 REAL,
  afue REAL,
  hspf REAL,
  refrigerant TEXT,
  stage TEXT,  -- Also removed stage constraint for flexibility
  description TEXT,
  msrp REAL,
  category TEXT,
  subcategory TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data from old table
INSERT INTO products_new (id, sku, model, brand, type, tonnage, seer, seer2, afue, hspf, refrigerant, stage, created_at, updated_at)
SELECT id, sku, model, brand, type, tonnage, seer, seer2, afue, hspf, refrigerant, stage, created_at, updated_at FROM products;

-- Drop old table
DROP TABLE products;

-- Rename new table
ALTER TABLE products_new RENAME TO products;

-- Recreate indexes
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_brand_type ON products(brand, type);
CREATE INDEX idx_products_specs ON products(tonnage, seer, type);

-- Recreate trigger
CREATE TRIGGER products_updated_at 
  AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;