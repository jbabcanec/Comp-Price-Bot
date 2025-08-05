-- Add competitor price tracking to crosswalk mappings
ALTER TABLE crosswalk_mappings ADD COLUMN competitor_price DECIMAL(10,2);
ALTER TABLE crosswalk_mappings ADD COLUMN price_date DATE;
ALTER TABLE crosswalk_mappings ADD COLUMN source_file TEXT;
ALTER TABLE crosswalk_mappings ADD COLUMN extraction_confidence REAL;

-- Temporary extraction storage for AI-first workflow
CREATE TABLE IF NOT EXISTS temp_extractions (
  id INTEGER PRIMARY KEY,
  batch_id TEXT NOT NULL,
  product_data JSON NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT FALSE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_crosswalk_sku ON crosswalk_mappings(competitor_sku);
CREATE INDEX IF NOT EXISTS idx_crosswalk_company ON crosswalk_mappings(competitor_company);
CREATE INDEX IF NOT EXISTS idx_temp_batch ON temp_extractions(batch_id);
CREATE INDEX IF NOT EXISTS idx_crosswalk_price_date ON crosswalk_mappings(price_date);