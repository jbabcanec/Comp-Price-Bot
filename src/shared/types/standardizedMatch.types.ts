/**
 * Standardized Match Result Types for Database Persistence
 * 
 * This ensures consistent output format regardless of matching stage:
 * Stage 1 (Exact) → Stage 2 (Fuzzy) → Stage 3 (Specs) → Stage 4 (AI) → Stage 5 (Web Research)
 * 
 * All stages produce the same standardized output for seamless database storage
 */

/**
 * Standardized match result that goes into the database
 * This is the FINAL format regardless of which stage produced it
 */
export interface StandardizedMatchResult {
  // Request metadata
  readonly requestId: string;
  readonly timestamp: string; // ISO timestamp
  readonly processingTimeMs: number;
  
  // Competitor product info
  readonly competitor: {
    readonly sku: string;
    readonly company: string;
    readonly model?: string;
    readonly price?: number;
    readonly specifications?: CompetitorSpecs;
  };
  
  // Match result (null if no match found)
  readonly match: MatchDetails | null;
  
  // Processing information
  readonly processing: {
    readonly stage: MatchingStage;
    readonly method: MatchingMethod;
    readonly confidence: number; // 0.0 - 1.0
    readonly reasoning: readonly string[];
    readonly processingSteps: readonly string[];
    readonly fromCache: boolean;
    readonly aiTokensUsed?: number;
    readonly webSourcesSearched?: number;
  };
  
  // Quality assurance
  readonly validation: {
    readonly isValid: boolean;
    readonly warnings: readonly string[];
    readonly qualityScore: number; // 0.0 - 1.0
  };
  
  // Audit trail
  readonly metadata: {
    readonly source: string; // 'batch' | 'single' | 'manual'
    readonly userId?: string;
    readonly sessionId?: string;
    readonly flags: readonly MatchFlag[];
  };
}

/**
 * Our product match details
 */
export interface MatchDetails {
  readonly ourSku: string;
  readonly ourModel: string;
  readonly ourBrand: string;
  readonly ourType: ProductType;
  readonly ourPrice?: number;
  readonly specifications: OurProductSpecs;
  readonly availability?: 'in_stock' | 'backordered' | 'discontinued';
}

/**
 * Competitor specifications (normalized)
 */
export interface CompetitorSpecs {
  readonly tonnage?: number;
  readonly seer?: number;
  readonly eer?: number;
  readonly afue?: number;
  readonly hspf?: number;
  readonly cop?: number;
  readonly refrigerant?: string;
  readonly voltage?: number;
  readonly phase?: number;
  readonly productType?: string;
  readonly application?: 'residential' | 'commercial' | 'industrial';
  readonly features?: readonly string[];
}

/**
 * Our product specifications (normalized)
 */
export interface OurProductSpecs {
  readonly tonnage?: number;
  readonly seer?: number;
  readonly seer2?: number;
  readonly eer?: number;
  readonly afue?: number;
  readonly hspf?: number;
  readonly hspf2?: number;
  readonly cop?: number;
  readonly refrigerant?: string;
  readonly voltage?: number;
  readonly phase?: number;
  readonly stage?: 'single' | 'two-stage' | 'variable';
  readonly certifications?: readonly string[];
}

/**
 * Matching stages (what stage found the match)
 */
export type MatchingStage = 
  | 'exact'           // Stage 1: Direct SKU/Model match
  | 'fuzzy'           // Stage 2: Similarity matching
  | 'specification'   // Stage 3: Spec-based matching
  | 'ai_enhanced'     // Stage 4: AI/ChatGPT matching
  | 'web_research'    // Stage 5: Web research matching
  | 'manual'          // Manual override
  | 'failed';         // No match found

/**
 * Specific matching methods within each stage
 */
export type MatchingMethod =
  | 'exact_sku'       // Direct SKU match
  | 'exact_model'     // Direct model number match
  | 'fuzzy_sku'       // Fuzzy SKU similarity
  | 'fuzzy_model'     // Fuzzy model similarity
  | 'fuzzy_combined'  // Combined fuzzy matching
  | 'spec_tonnage'    // Tonnage + type match
  | 'spec_efficiency' // Efficiency ratings match
  | 'spec_combined'   // Multiple specs match
  | 'ai_gpt4'         // GPT-4 matching
  | 'ai_gpt4_batch'   // GPT-4 batch processing
  | 'web_manufacturer'// Manufacturer website
  | 'web_distributor' // Distributor catalog
  | 'web_ahri'        // AHRI directory
  | 'manual_review'   // Human verification
  | 'cached_result';  // Retrieved from cache

/**
 * Product types (standardized)
 */
export type ProductType = 'AC' | 'Heat Pump' | 'Furnace' | 'Air Handler' | 'Package Unit' | 'Other';

/**
 * Match quality flags
 */
export type MatchFlag = 
  | 'high_confidence'     // >90% confidence
  | 'medium_confidence'   // 70-90% confidence
  | 'low_confidence'      // 50-70% confidence
  | 'needs_review'        // <50% confidence or other issues
  | 'price_mismatch'      // Significant price difference
  | 'spec_mismatch'       // Specification inconsistencies
  | 'brand_mismatch'      // Different brand equivalency
  | 'discontinued'        // Our product is discontinued
  | 'partial_match'       // Only some specs match
  | 'ai_generated'        // Match from AI system
  | 'web_verified'        // Verified through web research
  | 'manual_verified'     // Human verified
  | 'cache_hit'           // Retrieved from cache
  | 'requires_approval';  // Needs manual approval

/**
 * Database storage format (flattened for SQLite)
 */
export interface DatabaseMatchRecord {
  // Primary key and indexing
  id?: number;
  request_id: string;
  competitor_sku: string;
  competitor_company: string;
  
  // Match result
  our_sku: string | null;
  our_model: string | null;
  our_brand: string | null;
  our_type: string | null;
  
  // Processing info
  matching_stage: MatchingStage;
  matching_method: MatchingMethod;
  confidence: number;
  reasoning: string; // JSON array
  processing_steps: string; // JSON array
  from_cache: boolean;
  
  // Specifications (JSON)
  competitor_specs: string; // JSON
  our_specs: string; // JSON
  
  // Metadata
  processing_time_ms: number;
  ai_tokens_used: number | null;
  web_sources_searched: number | null;
  quality_score: number;
  flags: string; // JSON array
  
  // Audit
  source: string;
  user_id: string | null;
  session_id: string | null;
  created_at: string; // ISO timestamp
  
  // Additional fields
  competitor_price: number | null;
  our_price: number | null;
  warnings: string; // JSON array
  
  // Indexing helpers
  competitor_key: string; // sku + company hash for fast lookup
  processing_date: string; // YYYY-MM-DD for date queries
}

/**
 * Standardized response format for all matching operations
 */
export interface MatchingResponse {
  readonly success: boolean;
  readonly results: readonly StandardizedMatchResult[];
  readonly summary: {
    readonly totalProcessed: number;
    readonly successfulMatches: number;
    readonly failedMatches: number;
    readonly averageConfidence: number;
    readonly averageProcessingTime: number;
    readonly stageBreakdown: Record<MatchingStage, number>;
    readonly methodBreakdown: Record<MatchingMethod, number>;
  };
  readonly performance: {
    readonly totalTimeMs: number;
    readonly cacheHits: number;
    readonly aiCallsMade: number;
    readonly webSearchesMade: number;
    readonly tokensUsed: number;
    readonly estimatedCost: number;
  };
  readonly errors: readonly ProcessingError[];
}

/**
 * Processing error format
 */
export interface ProcessingError {
  readonly competitorSku: string;
  readonly stage: MatchingStage;
  readonly errorCode: string;
  readonly message: string;
  readonly details?: Record<string, any>;
  readonly timestamp: string;
  readonly recoverable: boolean;
}

/**
 * Result normalizer interface - converts any stage output to standard format
 */
export interface ResultNormalizer {
  normalize(
    rawResult: any,
    competitor: any,
    stage: MatchingStage,
    method: MatchingMethod
  ): StandardizedMatchResult;
}

/**
 * Configuration for result standardization
 */
export interface StandardizationConfig {
  readonly enableValidation: boolean;
  readonly requireConfidenceThreshold: number;
  readonly flagLowConfidence: boolean;
  readonly validateSpecifications: boolean;
  readonly checkPriceConsistency: boolean;
  readonly enableQualityScoring: boolean;
}

/**
 * JSON Schema for validation (ensures database consistency)
 */
export const STANDARDIZED_MATCH_SCHEMA = {
  type: 'object',
  required: ['requestId', 'timestamp', 'competitor', 'processing', 'validation', 'metadata'],
  properties: {
    requestId: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
    timestamp: { type: 'string', format: 'date-time' },
    processingTimeMs: { type: 'number', minimum: 0 },
    
    competitor: {
      type: 'object',
      required: ['sku', 'company'],
      properties: {
        sku: { type: 'string', minLength: 1, maxLength: 100 },
        company: { type: 'string', minLength: 1, maxLength: 100 },
        model: { type: 'string', maxLength: 100 },
        price: { type: 'number', minimum: 0 }
      }
    },
    
    match: {
      type: ['object', 'null'],
      properties: {
        ourSku: { type: 'string', minLength: 1, maxLength: 100 },
        ourModel: { type: 'string', minLength: 1, maxLength: 100 },
        ourBrand: { type: 'string', minLength: 1, maxLength: 50 },
        ourType: { enum: ['AC', 'Heat Pump', 'Furnace', 'Air Handler', 'Package Unit', 'Other'] }
      }
    },
    
    processing: {
      type: 'object',
      required: ['stage', 'method', 'confidence', 'reasoning', 'processingSteps', 'fromCache'],
      properties: {
        stage: { enum: ['exact', 'fuzzy', 'specification', 'ai_enhanced', 'web_research', 'manual', 'failed'] },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'array', items: { type: 'string' } },
        processingSteps: { type: 'array', items: { type: 'string' } },
        fromCache: { type: 'boolean' }
      }
    },
    
    validation: {
      type: 'object',
      required: ['isValid', 'warnings', 'qualityScore'],
      properties: {
        isValid: { type: 'boolean' },
        warnings: { type: 'array', items: { type: 'string' } },
        qualityScore: { type: 'number', minimum: 0, maximum: 1 }
      }
    }
  },
  additionalProperties: false
} as const;