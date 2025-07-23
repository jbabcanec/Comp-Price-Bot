/**
 * HVAC brand-specific constants and configurations
 */

import { HVAC_BRANDS, BRAND_SKU_PREFIXES } from './hvac';

/**
 * Brand normalization mapping for common variations
 */
export const BRAND_ALIASES: Record<string, string> = {
  // Trane variations
  'trane': 'Trane',
  'TRANE': 'Trane',
  
  // Carrier variations  
  'carrier': 'Carrier',
  'CARRIER': 'Carrier',
  
  // Lennox variations
  'lennox': 'Lennox',
  'LENNOX': 'Lennox',
  
  // York variations
  'york': 'York',
  'YORK': 'York',
  
  // Goodman variations
  'goodman': 'Goodman',
  'GOODMAN': 'Goodman',
  
  // Rheem variations
  'rheem': 'Rheem',
  'RHEEM': 'Rheem',
  
  // Payne variations
  'payne': 'Payne',
  'PAYNE': 'Payne',
  
  // Bryant variations
  'bryant': 'Bryant',
  'BRYANT': 'Bryant',
  
  // Day & Night variations
  'day & night': 'Day & Night',
  'day and night': 'Day & Night',
  'day&night': 'Day & Night',
  'daynight': 'Day & Night',
  
  // ComfortMaker variations
  'comfortmaker': 'ComfortMaker',
  'comfort maker': 'ComfortMaker',
  'COMFORTMAKER': 'ComfortMaker',
  
  // American Standard variations
  'american standard': 'American Standard',
  'americanstandard': 'American Standard',
  'AMERICAN STANDARD': 'American Standard',
  
  // Heil variations
  'heil': 'Heil',
  'HEIL': 'Heil',
  
  // Tempstar variations
  'tempstar': 'Tempstar',
  'TEMPSTAR': 'Tempstar',
  
  // Ruud variations
  'ruud': 'Ruud',
  'RUUD': 'Ruud',
  
  // Amana variations
  'amana': 'Amana',
  'AMANA': 'Amana'
};

/**
 * Brand tier classification for quality/price expectations
 */
export const BRAND_TIERS = {
  premium: ['Trane', 'Carrier', 'Lennox', 'Daikin'],
  mid_tier: ['York', 'Rheem', 'Bryant', 'American Standard'],
  value: ['Goodman', 'Amana', 'Payne', 'Heil', 'Tempstar'],
  specialty: ['Mitsubishi', 'Day & Night', 'ComfortMaker']
} as const;

/**
 * Brand-specific product line patterns
 */
export const BRAND_PRODUCT_LINES: Record<string, string[]> = {
  'Trane': ['XR', 'XL', 'XV', 'XC', 'S9V2', 'S8X2'],
  'Carrier': ['Performance', 'Comfort', 'Infinity', 'WeatherExpert'],
  'Lennox': ['Elite', 'Merit', 'XC', 'XP', 'SL', 'ML'],
  'York': ['LX', 'CZ', 'YC', 'YK', 'YP'],
  'Goodman': ['GSX', 'GSXC', 'DSZC', 'GMSS'],
  'Rheem': ['Classic', 'Prestige', 'EcoNet'],
  'Bryant': ['Evolution', 'Preferred', 'Legacy'],
  'American Standard': ['Platinum', 'Gold', 'Silver', 'Heritage']
};

/**
 * Get normalized brand name from various inputs
 */
export function normalizeBrandName(input: string): string {
  const cleaned = input.trim().toLowerCase();
  return BRAND_ALIASES[cleaned] || capitalizeWords(input);
}

/**
 * Check if a brand is a known HVAC manufacturer
 */
export function isKnownHVACBrand(brand: string): boolean {
  const normalized = normalizeBrandName(brand);
  return HVAC_BRANDS.includes(normalized as any);
}

/**
 * Infer brand from SKU prefix
 */
export function inferBrandFromSku(sku: string): string | null {
  if (!sku) return null;
  
  const skuUpper = sku.toUpperCase();
  
  for (const [prefix, brand] of Object.entries(BRAND_SKU_PREFIXES)) {
    if (skuUpper.startsWith(prefix)) {
      return brand;
    }
  }
  
  return null;
}

/**
 * Get brand tier for pricing expectations
 */
export function getBrandTier(brand: string): keyof typeof BRAND_TIERS | null {
  const normalized = normalizeBrandName(brand);
  
  // Check each tier explicitly to avoid type issues
  if (BRAND_TIERS.premium.includes(normalized as any)) return 'premium';
  if (BRAND_TIERS.mid_tier.includes(normalized as any)) return 'mid_tier';
  if (BRAND_TIERS.value.includes(normalized as any)) return 'value';
  if (BRAND_TIERS.specialty.includes(normalized as any)) return 'specialty';
  
  return null;
}

/**
 * Utility function to capitalize words
 */
function capitalizeWords(str: string): string {
  return str.replace(/\b\w+/g, word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
}