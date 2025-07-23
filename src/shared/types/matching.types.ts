/**
 * Types for the HVAC Product matching engine
 */

export interface CompetitorProduct {
  sku: string;
  company: string;
  price?: number;
  model?: string;
  description?: string;
  specifications?: Record<string, any>;
  source?: string;
}

export interface OurProduct {
  id: number;
  sku: string;
  model: string;
  brand: string;
  type: string;
  tonnage?: number;
  seer?: number;
  seer2?: number;
  afue?: number;
  hspf?: number;
  refrigerant?: string;
  stage?: string;
  created_at?: string;
  specifications?: Record<string, any>;
}

export interface MatchResult {
  ourSku: string;
  ourProduct: OurProduct;
  confidence: number;
  matchMethod: MatchMethod;
  reasoning: string[];
  specifications?: {
    matched: string[];
    mismatched: string[];
    missing: string[];
  };
  score?: {
    exact: number;
    model: number;
    specifications: number;
    overall: number;
  };
}

export type MatchMethod = 
  | 'exact_sku'
  | 'exact_model' 
  | 'model_fuzzy'
  | 'specifications'
  | 'ai_enhanced'
  | 'hybrid'
  | 'existing_mapping';

export interface MatchingOptions {
  enabledStrategies: MatchMethod[];
  confidenceThreshold: number;
  maxResults: number;
  useAI: boolean;
  strictMode: boolean;
  specifications: {
    tonnageTolerance: number;
    seerTolerance: number;
    afueTolerance: number;
    hspfTolerance: number;
  };
}

export interface MatchingRequest {
  competitorProduct: CompetitorProduct;
  ourProducts: OurProduct[];
  options: MatchingOptions;
}

export interface MatchingResponse {
  competitorProduct: CompetitorProduct;
  matches: MatchResult[];
  processingTime: number;
  totalCandidates: number;
  strategiesUsed: MatchMethod[];
  confidence: 'high' | 'medium' | 'low' | 'none';
}

export interface ExistingMapping {
  id: number;
  our_sku: string;
  competitor_sku: string;
  competitor_company: string;
  confidence: number;
  match_method: string;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MatchingStats {
  totalProcessed: number;
  exactMatches: number;
  fuzzyMatches: number;
  specMatches: number;
  aiMatches: number;
  noMatches: number;
  averageConfidence: number;
  averageProcessingTime: number;
  strategiesUsage: Record<MatchMethod, number>;
}

export interface SpecificationComparison {
  field: string;
  ourValue: any;
  theirValue: any;
  match: boolean;
  tolerance?: number;
  confidence: number;
}

export interface ModelComparison {
  ourModel: string;
  theirModel: string;
  similarity: number;
  method: 'exact' | 'prefix' | 'suffix' | 'contains' | 'fuzzy';
  confidence: number;
}