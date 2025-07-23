-- Email Processing Optimization Tables
-- Migration 002: Add email processing and metadata tables

-- Email metadata table for tracking processed emails
CREATE TABLE IF NOT EXISTS email_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  processing_method TEXT NOT NULL, -- 'MSG_FULL', 'EML_FULL', etc.
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processing_time_ms INTEGER NOT NULL,
  total_components INTEGER DEFAULT 0,
  text_components INTEGER DEFAULT 0,
  image_components INTEGER DEFAULT 0,
  attachment_components INTEGER DEFAULT 0,
  embedded_images INTEGER DEFAULT 0,
  total_data_extracted INTEGER DEFAULT 0,
  unique_items_extracted INTEGER DEFAULT 0,
  average_confidence REAL DEFAULT 0.0,
  source_breakdown_text_only INTEGER DEFAULT 0,
  source_breakdown_image_only INTEGER DEFAULT 0,
  source_breakdown_attachment_only INTEGER DEFAULT 0,
  source_breakdown_multiple INTEGER DEFAULT 0,
  cache_enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(file_path, file_hash)
);

-- Indexes for email metadata
CREATE INDEX IF NOT EXISTS idx_email_metadata_file_hash ON email_metadata(file_hash);
CREATE INDEX IF NOT EXISTS idx_email_metadata_processed_at ON email_metadata(processed_at);
CREATE INDEX IF NOT EXISTS idx_email_metadata_file_name ON email_metadata(file_name);
CREATE INDEX IF NOT EXISTS idx_email_metadata_processing_time ON email_metadata(processing_time_ms);

-- Email extracted data table (normalized storage)
CREATE TABLE IF NOT EXISTS email_extracted_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_metadata_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  company TEXT NOT NULL,
  price DECIMAL(10,2),
  model TEXT,
  description TEXT,
  source TEXT, -- 'Email Text', 'Image OCR', 'PDF Attachment', etc.
  confidence REAL DEFAULT 0.0,
  extraction_method TEXT, -- 'ocr', 'text', 'pdf', etc.
  processing_notes TEXT,
  -- HVAC-specific fields
  tonnage REAL,
  seer REAL,
  seer2 REAL,
  afue REAL,
  hspf REAL,
  refrigerant TEXT,
  stage TEXT,
  product_type TEXT,
  -- Email processing specific
  sources TEXT, -- JSON array of sources
  correlation_support_count INTEGER DEFAULT 0,
  correlation_notes TEXT,
  multi_source_confidence BOOLEAN DEFAULT 0,
  orphaned BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (email_metadata_id) REFERENCES email_metadata(id) ON DELETE CASCADE
);

-- Indexes for extracted data
CREATE INDEX IF NOT EXISTS idx_email_extracted_data_email_id ON email_extracted_data(email_metadata_id);
CREATE INDEX IF NOT EXISTS idx_email_extracted_data_sku ON email_extracted_data(sku);
CREATE INDEX IF NOT EXISTS idx_email_extracted_data_company ON email_extracted_data(company);
CREATE INDEX IF NOT EXISTS idx_email_extracted_data_confidence ON email_extracted_data(confidence);
CREATE INDEX IF NOT EXISTS idx_email_extracted_data_source ON email_extracted_data(source);

-- Email processing statistics (for analytics)
CREATE TABLE IF NOT EXISTS email_processing_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  total_emails_processed INTEGER DEFAULT 0,
  total_processing_time_ms INTEGER DEFAULT 0,
  average_processing_time_ms REAL DEFAULT 0.0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  cache_hit_rate REAL DEFAULT 0.0,
  total_data_extracted INTEGER DEFAULT 0,
  average_confidence REAL DEFAULT 0.0,
  -- Method breakdown
  msg_processed INTEGER DEFAULT 0,
  eml_processed INTEGER DEFAULT 0,
  fallback_processed INTEGER DEFAULT 0,
  -- Component breakdown
  total_text_components INTEGER DEFAULT 0,
  total_image_components INTEGER DEFAULT 0,
  total_attachment_components INTEGER DEFAULT 0,
  -- Source breakdown
  text_only_items INTEGER DEFAULT 0,
  image_only_items INTEGER DEFAULT 0,
  attachment_only_items INTEGER DEFAULT 0,
  multiple_source_items INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(date)
);

-- Index for processing stats
CREATE INDEX IF NOT EXISTS idx_email_processing_stats_date ON email_processing_stats(date);

-- Email batch jobs table (for tracking background processing)
CREATE TABLE IF NOT EXISTS email_batch_jobs (
  id TEXT PRIMARY KEY, -- UUID
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed', 'cancelled'
  total_files INTEGER NOT NULL,
  processed_files INTEGER DEFAULT 0,
  successful_files INTEGER DEFAULT 0,
  failed_files INTEGER DEFAULT 0,
  total_data_extracted INTEGER DEFAULT 0,
  average_confidence REAL DEFAULT 0.0,
  processing_options TEXT, -- JSON
  current_file TEXT,
  estimated_completion DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  total_processing_time_ms INTEGER,
  error_message TEXT
);

-- Index for batch jobs
CREATE INDEX IF NOT EXISTS idx_email_batch_jobs_status ON email_batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_email_batch_jobs_created_at ON email_batch_jobs(created_at);

-- Email cache entries table (for persistent cache management)
CREATE TABLE IF NOT EXISTS email_cache_entries (
  cache_key TEXT PRIMARY KEY,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  processing_time_ms INTEGER NOT NULL,
  total_data_extracted INTEGER NOT NULL,
  cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  access_count INTEGER DEFAULT 1,
  cache_size_bytes INTEGER DEFAULT 0, -- Size of cached result
  expires_at DATETIME NOT NULL
);

-- Indexes for cache entries
CREATE INDEX IF NOT EXISTS idx_email_cache_entries_file_hash ON email_cache_entries(file_hash);
CREATE INDEX IF NOT EXISTS idx_email_cache_entries_accessed_at ON email_cache_entries(accessed_at);
CREATE INDEX IF NOT EXISTS idx_email_cache_entries_expires_at ON email_cache_entries(expires_at);

-- Email processing errors table (for debugging and monitoring)
CREATE TABLE IF NOT EXISTS email_processing_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  error_type TEXT NOT NULL, -- 'parsing', 'ocr', 'timeout', 'memory', etc.
  error_message TEXT NOT NULL,
  error_stack TEXT,
  processing_stage TEXT, -- 'email_parsing', 'component_routing', etc.
  retry_attempt INTEGER DEFAULT 0,
  occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN DEFAULT 0,
  resolution_notes TEXT
);

-- Index for processing errors
CREATE INDEX IF NOT EXISTS idx_email_processing_errors_occurred_at ON email_processing_errors(occurred_at);
CREATE INDEX IF NOT EXISTS idx_email_processing_errors_error_type ON email_processing_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_email_processing_errors_resolved ON email_processing_errors(resolved);

-- Create triggers for automatic updates
CREATE TRIGGER IF NOT EXISTS update_email_metadata_timestamp 
  AFTER UPDATE ON email_metadata
  FOR EACH ROW
BEGIN
  UPDATE email_metadata SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update daily stats when emails are processed
CREATE TRIGGER IF NOT EXISTS update_daily_email_stats
  AFTER INSERT ON email_metadata
  FOR EACH ROW
BEGIN
  INSERT OR REPLACE INTO email_processing_stats (
    date,
    total_emails_processed,
    total_processing_time_ms,
    average_processing_time_ms,
    total_data_extracted
  ) VALUES (
    DATE(NEW.processed_at),
    COALESCE((SELECT total_emails_processed FROM email_processing_stats WHERE date = DATE(NEW.processed_at)), 0) + 1,
    COALESCE((SELECT total_processing_time_ms FROM email_processing_stats WHERE date = DATE(NEW.processed_at)), 0) + NEW.processing_time_ms,
    (COALESCE((SELECT total_processing_time_ms FROM email_processing_stats WHERE date = DATE(NEW.processed_at)), 0) + NEW.processing_time_ms) / 
    (COALESCE((SELECT total_emails_processed FROM email_processing_stats WHERE date = DATE(NEW.processed_at)), 0) + 1),
    COALESCE((SELECT total_data_extracted FROM email_processing_stats WHERE date = DATE(NEW.processed_at)), 0) + NEW.total_data_extracted
  );
END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS email_processing_summary AS
SELECT 
  DATE(processed_at) as processing_date,
  COUNT(*) as emails_processed,
  AVG(processing_time_ms) as avg_processing_time,
  SUM(total_data_extracted) as total_items_extracted,
  AVG(average_confidence) as avg_confidence,
  COUNT(CASE WHEN processing_method LIKE '%MSG%' THEN 1 END) as msg_files,
  COUNT(CASE WHEN processing_method LIKE '%EML%' THEN 1 END) as eml_files
FROM email_metadata
GROUP BY DATE(processed_at)
ORDER BY processing_date DESC;

CREATE VIEW IF NOT EXISTS top_performing_emails AS
SELECT 
  file_name,
  total_data_extracted,
  average_confidence,
  processing_time_ms,
  processed_at,
  (total_data_extracted * average_confidence * 1000.0 / processing_time_ms) as efficiency_score
FROM email_metadata
WHERE total_data_extracted > 0
ORDER BY efficiency_score DESC
LIMIT 100;

CREATE VIEW IF NOT EXISTS email_error_summary AS
SELECT 
  error_type,
  COUNT(*) as error_count,
  COUNT(CASE WHEN resolved = 1 THEN 1 END) as resolved_count,
  MAX(occurred_at) as last_occurrence,
  AVG(retry_attempt) as avg_retry_attempts
FROM email_processing_errors
GROUP BY error_type
ORDER BY error_count DESC;