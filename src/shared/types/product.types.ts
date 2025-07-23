/**
 * Product-related types for the HVAC Crosswalk application
 * Updated for Phase 2: Product Management implementation
 */

export type ProductType = 'air_conditioner' | 'heat_pump' | 'furnace' | 'coil' | 'other';
export type StageType = 'single' | 'two-stage' | 'variable';

/**
 * Main product interface - represents YOUR product catalog
 */
export interface Product {
  id?: number;
  sku: string;
  model: string;
  brand: string;
  type: ProductType;
  tonnage?: number;
  seer?: number;
  seer2?: number;
  afue?: number;
  hspf?: number;
  refrigerant?: string;
  stage?: StageType;
  description?: string;
  msrp?: number;
  category?: string;
  subcategory?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Product validation result from import process
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleanedProduct?: Product;
}

/**
 * Bulk import summary statistics
 */
export interface ImportSummary {
  totalProcessed: number;
  validProducts: number;
  invalidProducts: number;
  duplicateSkus: number;
  warnings: number;
  products: Product[];
  errors: Array<{
    row: number;
    sku: string;
    errors: string[];
  }>;
}

/**
 * Product filter and search options
 */
export interface ProductSearchFilters {
  search?: string;
  brand?: string;
  type?: ProductType;
  tonnageMin?: number;
  tonnageMax?: number;
  seerMin?: number;
  seerMax?: number;
}

/**
 * Product sorting options
 */
export interface ProductSort {
  field: keyof Product;
  direction: 'asc' | 'desc';
}

/**
 * Product creation input
 */
export interface ProductCreateInput {
  sku: string;
  model: string;
  brand: string;
  type: ProductType;
  tonnage?: number;
  seer?: number;
  seer2?: number;
  afue?: number;
  hspf?: number;
  refrigerant?: string;
  stage?: StageType;
  description?: string;
  msrp?: number;
  category?: string;
  subcategory?: string;
}

/**
 * Product update input
 */
export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  id: number;
}