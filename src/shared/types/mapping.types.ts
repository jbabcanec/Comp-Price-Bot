// Mapping-related types for the HVAC Crosswalk application

export interface Mapping {
  id?: number;
  our_sku: string;
  competitor_sku: string;
  competitor_company: string;
  confidence: number; // 0-1
  match_method: 'exact' | 'model' | 'specs' | 'ai' | 'manual';
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MappingCreateInput {
  our_sku: string;
  competitor_sku: string;
  competitor_company: string;
  confidence: number;
  match_method: Mapping['match_method'];
  verified?: boolean;
  verified_by?: string;
  notes?: string;
}

export interface MappingUpdateInput extends Partial<MappingCreateInput> {
  id: number;
}

export interface MappingSearchFilters {
  our_sku?: string;
  competitor_company?: string;
  verified?: boolean;
  min_confidence?: number;
  match_method?: Mapping['match_method'];
}

export interface CrosswalkResult {
  our_product?: {
    sku: string;
    model: string;
    brand: string;
    type: string;
    specs?: {
      tonnage?: number;
      seer?: number;
      afue?: number;
    };
  };
  competitor_product: {
    sku: string;
    company: string;
    price?: number;
    description?: string;
  };
  mapping?: Mapping;
  suggestions?: Mapping[];
}