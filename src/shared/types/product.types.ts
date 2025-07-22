// Product-related types for the HVAC Crosswalk application

export interface Product {
  id?: number;
  sku: string;
  model: string;
  brand: string;
  type: 'AC' | 'Furnace' | 'Heat Pump' | 'Air Handler';
  tonnage?: number;
  seer?: number;
  seer2?: number;
  afue?: number;
  hspf?: number;
  refrigerant?: string;
  stage?: 'single' | 'two-stage' | 'variable';
  created_at?: string;
  updated_at?: string;
}

export interface ProductSearchFilters {
  brand?: string;
  type?: Product['type'];
  tonnage?: number;
  seer?: number;
  search?: string; // For searching SKU, model, etc.
}

export interface ProductCreateInput {
  sku: string;
  model: string;
  brand: string;
  type: Product['type'];
  tonnage?: number;
  seer?: number;
  seer2?: number;
  afue?: number;
  hspf?: number;
  refrigerant?: string;
  stage?: Product['stage'];
}

export interface ProductUpdateInput extends Partial<ProductCreateInput> {
  id: number;
}