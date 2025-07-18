// File upload constants
export const ACCEPTED_FILE_TYPES = '.pdf,.doc,.docx,.txt,.json,.jpg,.jpeg,.png,.eml,.msg';

export const FILE_TYPE_LABELS = {
  pdf: 'PDF Document',
  doc: 'Word Document',
  docx: 'Word Document',
  txt: 'Text File',
  json: 'JSON Data',
  jpg: 'Image',
  jpeg: 'Image',
  png: 'Image',
  eml: 'Email',
  msg: 'Outlook Email',
};

// Match confidence levels
export const CONFIDENCE_LEVELS = {
  HIGH: { threshold: 0.8, color: 'green', label: 'High Confidence' },
  MEDIUM: { threshold: 0.6, color: 'orange', label: 'Medium Confidence' },
  LOW: { threshold: 0, color: 'red', label: 'Low Confidence' },
};

// API endpoints (relative to base URL)
export const API_ENDPOINTS = {
  HEALTH: '/health',
  UPLOAD: '/upload',
  SEARCH: '/search',
  MATCHES: '/matches',
  AGENTS_STATUS: '/agents/status',
};

// UI Messages
export const MESSAGES = {
  UPLOAD_SUCCESS: 'File processed successfully!',
  UPLOAD_FAILED: 'Failed to process file',
  NO_FILE: 'Please select a file to upload',
  SYSTEM_NOT_READY: 'System is not ready. Please check the connection.',
  API_KEY_MISSING: 'OpenAI API key not configured. Please add your API key to continue.',
};