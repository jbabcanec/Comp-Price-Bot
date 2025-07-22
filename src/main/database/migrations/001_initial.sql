-- Initial database schema for HVAC Crosswalk application
-- Migration 001: Create core tables

-- Your product catalog
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('AC', 'Furnace', 'Heat Pump', 'Air Handler')),
  tonnage REAL,
  seer REAL,
  seer2 REAL,
  afue REAL,
  hspf REAL,
  refrigerant TEXT,
  stage TEXT CHECK(stage IN ('single', 'two-stage', 'variable')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Competitor SKU mappings
CREATE TABLE IF NOT EXISTS mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  our_sku TEXT NOT NULL,
  competitor_sku TEXT NOT NULL,
  competitor_company TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  match_method TEXT NOT NULL CHECK(match_method IN ('exact', 'model', 'specs', 'ai', 'manual')),
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at DATETIME,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (our_sku) REFERENCES products(sku) ON DELETE CASCADE,
  UNIQUE(competitor_sku, competitor_company)
);

-- Processing history
CREATE TABLE IF NOT EXISTS processing_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  company_name TEXT NOT NULL,
  total_items INTEGER DEFAULT 0,
  matched_items INTEGER DEFAULT 0,
  unmatched_items INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  status TEXT CHECK(status IN ('success', 'partial', 'failed')) DEFAULT 'success',
  error_message TEXT,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(file_hash)
);

-- Competitor data cache
CREATE TABLE IF NOT EXISTS competitor_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL,
  company TEXT NOT NULL,
  price DECIMAL(10,2),
  description TEXT,
  source_file TEXT,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sku, company)
);

-- Application settings
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  type TEXT CHECK(type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_brand_type ON products(brand, type);
CREATE INDEX IF NOT EXISTS idx_products_specs ON products(tonnage, seer, type);

CREATE INDEX IF NOT EXISTS idx_mappings_our_sku ON mappings(our_sku);
CREATE INDEX IF NOT EXISTS idx_mappings_competitor ON mappings(competitor_sku, competitor_company);
CREATE INDEX IF NOT EXISTS idx_mappings_verified ON mappings(verified);

CREATE INDEX IF NOT EXISTS idx_processing_history_hash ON processing_history(file_hash);
CREATE INDEX IF NOT EXISTS idx_processing_history_company ON processing_history(company_name);
CREATE INDEX IF NOT EXISTS idx_processing_history_date ON processing_history(processed_at);

CREATE INDEX IF NOT EXISTS idx_competitor_data_sku_company ON competitor_data(sku, company);
CREATE INDEX IF NOT EXISTS idx_competitor_data_company ON competitor_data(company);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, type, description) VALUES
  ('app_version', '1.0.0', 'string', 'Application version'),
  ('database_version', '1', 'number', 'Database schema version'),
  ('default_confidence_threshold', '0.8', 'number', 'Minimum confidence for automatic matching'),
  ('auto_verify_exact_matches', 'true', 'boolean', 'Automatically verify exact SKU matches'),
  ('processing_batch_size', '100', 'number', 'Number of items to process in each batch');

-- Create triggers to update updated_at timestamps
CREATE TRIGGER IF NOT EXISTS products_updated_at 
  AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS mappings_updated_at 
  AFTER UPDATE ON mappings
BEGIN
  UPDATE mappings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS settings_updated_at 
  AFTER UPDATE ON settings
BEGIN
  UPDATE settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;