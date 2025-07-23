/**
 * HVAC industry constants and configurations
 */

/**
 * Known HVAC manufacturers/brands
 */
export const HVAC_BRANDS = [
  'Lennox',
  'Trane', 
  'Carrier',
  'York',
  'Goodman',
  'Rheem',
  'Payne',
  'Bryant',
  'Day & Night',
  'ComfortMaker',
  'Heil',
  'Tempstar',
  'Arcoaire',
  'KeepRite',
  'Ducane',
  'Allied',
  'Concord',
  'Fraser-Johnston',
  'Daikin',
  'Mitsubishi',
  'American Standard',
  'Ruud',
  'Westinghouse',
  'Amana'
] as const;

/**
 * Valid refrigerant types
 */
export const REFRIGERANTS = [
  'R-22',
  'R-410A',
  'R-32',
  'R-454B',
  'R-454C',
  'R-290'
] as const;

/**
 * HVAC equipment types
 */
export const HVAC_TYPES = [
  'air_conditioner',
  'heat_pump',
  'furnace',
  'coil',
  'other'
] as const;

/**
 * HVAC equipment categories for classification
 */
export const HVAC_CATEGORIES = [
  'air conditioner',
  'heat pump',
  'furnace',
  'air handler',
  'coil',
  'condenser',
  'evaporator',
  'package unit'
] as const;

/**
 * Standard tonnage sizes for HVAC equipment
 */
export const STANDARD_TONNAGES = [
  1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0
] as const;

/**
 * Typical SEER rating ranges
 */
export const SEER_RANGES = {
  MIN: 8,
  MAX: 30,
  TYPICAL_MIN: 13,
  TYPICAL_MAX: 22
} as const;

/**
 * AFUE efficiency ranges (for furnaces)
 */
export const AFUE_RANGES = {
  MIN: 70,
  MAX: 100,
  HIGH_EFFICIENCY: 90
} as const;

/**
 * HSPF rating ranges (for heat pumps)
 */
export const HSPF_RANGES = {
  MIN: 6,
  MAX: 15,
  TYPICAL_MIN: 7,
  TYPICAL_MAX: 12
} as const;

/**
 * Supported file extensions for processing
 */
export const SUPPORTED_FILE_EXTENSIONS = [
  // Spreadsheets
  '.csv',
  '.xlsx', 
  '.xls',
  
  // Documents
  '.txt',
  '.pdf',
  '.docx',
  '.doc',
  
  // Data formats
  '.json',
  '.xml',
  '.html',
  '.htm',
  
  // Email formats
  '.msg',
  '.eml',
  
  // Images (for OCR)
  '.jpg',
  '.jpeg',
  '.png',
  '.tiff',
  '.bmp',
  '.gif',
  
  // Archives
  '.zip',
  '.rar'
] as const;

/**
 * Brand prefix mappings for SKU inference
 */
export const BRAND_SKU_PREFIXES: Record<string, string> = {
  'TRN': 'Trane',
  'TRANE': 'Trane',
  'CAR': 'Carrier', 
  'CARR': 'Carrier',
  'CARRIER': 'Carrier',
  'LEN': 'Lennox',
  'LENNOX': 'Lennox',
  'YRK': 'York',
  'YORK': 'York',
  'GDM': 'Goodman',
  'GOODMAN': 'Goodman',
  'RHM': 'Rheem',
  'RHEEM': 'Rheem',
  'PAY': 'Payne',
  'PAYNE': 'Payne',
  'BRY': 'Bryant',
  'BRYANT': 'Bryant'
};

/**
 * Common HVAC SKU patterns (regex)
 */
export const SKU_PATTERNS = [
  /^[A-Z]{2,4}[-\s]?[0-9X]{2,4}[-\s]?[A-Z0-9]{2,6}$/i,  // TRN-XR16-024
  /^[0-9]{2}[A-Z]{2,4}[0-9]{3,6}[A-Z]?$/i,               // 16SEER036A  
  /^[A-Z]{3,5}[0-9]{3,6}[A-Z]{0,3}$/i                    // LEN036ABC
];

/**
 * Price validation ranges (in USD)
 */
export const PRICE_RANGES = {
  MIN_REASONABLE: 500,
  MAX_REASONABLE: 15000,
  WARNING_HIGH: 10000
} as const;