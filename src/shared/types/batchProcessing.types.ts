/**
 * Strict Type Definitions for Hyper-Efficient Batch Processing
 * 
 * All data transfers are strictly typed and validated with JSON schemas
 * to ensure maximum robustness and efficiency
 */

// Core data validation schemas
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

/**
 * Minimal competitor product for batch processing
 * Only essential fields to minimize data transfer
 */
export interface BatchCompetitor {
  readonly sku: string;
  readonly company: string;
  readonly model?: string;
  readonly price?: number;
  readonly specs?: {
    readonly tonnage?: number;
    readonly seer?: number;
    readonly afue?: number;
    readonly type?: 'AC' | 'Heat Pump' | 'Furnace' | 'Air Handler';
  };
}

/**
 * Minimal our product for batch processing context
 */
export interface BatchOurProduct {
  readonly sku: string;
  readonly model: string;
  readonly brand: string;
  readonly type: 'AC' | 'Heat Pump' | 'Furnace' | 'Air Handler';
  readonly tonnage?: number;
  readonly seer?: number;
  readonly afue?: number;
  readonly hspf?: number;
}

/**
 * Batch request with strict validation
 */
export interface BatchRequest {
  readonly id: string;
  readonly competitors: ReadonlyArray<BatchCompetitor>;
  readonly ourProducts: ReadonlyArray<BatchOurProduct>;
  readonly config: BatchConfig;
  readonly metadata: {
    readonly requestTime: string; // ISO timestamp
    readonly source: string;
    readonly priority: 'low' | 'normal' | 'high';
  };
}

/**
 * Batch configuration with defaults
 */
export interface BatchConfig {
  readonly maxItemsPerBatch: number; // Default: 8 (optimal for GPT-4)
  readonly timeoutMs: number; // Default: 30000
  readonly retryAttempts: number; // Default: 3
  readonly cacheEnabled: boolean; // Default: true
  readonly validateInputs: boolean; // Default: true
  readonly validateOutputs: boolean; // Default: true
}

/**
 * Single match result with strict structure
 */
export interface BatchMatchResult {
  readonly competitorSku: string;
  readonly ourSku: string | null;
  readonly confidence: number; // 0.0 - 1.0
  readonly method: 'exact' | 'fuzzy' | 'specs' | 'ai' | 'cache';
  readonly reasoning: ReadonlyArray<string>;
  readonly processingTimeMs: number;
  readonly fromCache: boolean;
}

/**
 * Batch response with comprehensive results
 */
export interface BatchResponse {
  readonly requestId: string;
  readonly results: ReadonlyArray<BatchMatchResult>;
  readonly metadata: {
    readonly processedAt: string; // ISO timestamp
    readonly totalProcessingTimeMs: number;
    readonly cacheHits: number;
    readonly aiCalls: number;
    readonly successRate: number; // 0.0 - 1.0
    readonly errors: ReadonlyArray<BatchError>;
  };
  readonly stats: {
    readonly totalItems: number;
    readonly successfulMatches: number;
    readonly failedMatches: number;
    readonly averageConfidence: number;
  };
}

/**
 * Standardized error format
 */
export interface BatchError {
  readonly competitorSku: string;
  readonly errorCode: 'VALIDATION_FAILED' | 'AI_ERROR' | 'TIMEOUT' | 'CACHE_ERROR' | 'UNKNOWN';
  readonly message: string;
  readonly details?: Record<string, any>;
  readonly timestamp: string; // ISO timestamp
}

/**
 * AI API request format (hyper-optimized)
 */
export interface AIBatchRequest {
  readonly competitors: ReadonlyArray<{
    readonly idx: number; // Index for result mapping
    readonly sku: string;
    readonly company: string;
    readonly model?: string;
    readonly specs?: string; // Serialized JSON for compactness
  }>;
  readonly context: ReadonlyArray<{
    readonly sku: string;
    readonly model: string;
    readonly type: string;
    readonly specs: string; // Serialized key specs only
  }>;
  readonly instructions: {
    readonly maxTokens: number;
    readonly temperature: number;
    readonly responseFormat: 'json_object';
  };
}

/**
 * AI API response format (strictly validated)
 */
export interface AIBatchResponse {
  readonly matches: ReadonlyArray<{
    readonly idx: number; // Maps to request index
    readonly found: boolean;
    readonly ourSku: string | null;
    readonly confidence: number;
    readonly reasoning: ReadonlyArray<string>;
    readonly specs: {
      readonly tonnage?: number;
      readonly seer?: number;
      readonly type?: string;
    };
  }>;
  readonly metadata: {
    readonly model: string;
    readonly tokensUsed: number;
    readonly processingTimeMs: number;
  };
}

/**
 * Cache entry format (minimal for efficiency)
 */
export interface CacheEntry {
  readonly key: string;
  readonly competitorSku: string;
  readonly result: {
    readonly ourSku: string | null;
    readonly confidence: number;
    readonly method: string;
    readonly reasoning: ReadonlyArray<string>;
  };
  readonly createdAt: number; // Unix timestamp
  readonly expiresAt: number; // Unix timestamp
  readonly hits: number;
}

/**
 * Performance monitoring data
 */
export interface BatchPerformanceMetrics {
  readonly requestId: string;
  readonly stages: ReadonlyArray<{
    readonly name: 'validation' | 'cache_lookup' | 'ai_processing' | 'result_parsing' | 'cache_store';
    readonly startTime: number; // Unix timestamp ms
    readonly endTime: number; // Unix timestamp ms
    readonly success: boolean;
    readonly dataSize: number; // Bytes
  }>;
  readonly totals: {
    readonly duration: number;
    readonly cacheHits: number;
    readonly aiCalls: number;
    readonly bytesProcessed: number;
  };
}

/**
 * Data validation schemas using JSON Schema format
 */
export const BATCH_SCHEMAS = {
  competitor: {
    type: 'object',
    required: ['sku', 'company'],
    properties: {
      sku: { type: 'string', minLength: 1, maxLength: 100, pattern: '^[A-Za-z0-9-_]+$' },
      company: { type: 'string', minLength: 1, maxLength: 100 },
      model: { type: 'string', maxLength: 100 },
      price: { type: 'number', minimum: 0, maximum: 1000000 },
      specs: {
        type: 'object',
        properties: {
          tonnage: { type: 'number', minimum: 0.5, maximum: 20 },
          seer: { type: 'number', minimum: 8, maximum: 30 },
          afue: { type: 'number', minimum: 80, maximum: 100 },
          type: { enum: ['AC', 'Heat Pump', 'Furnace', 'Air Handler'] }
        },
        additionalProperties: false
      }
    },
    additionalProperties: false
  },

  ourProduct: {
    type: 'object',
    required: ['sku', 'model', 'brand', 'type'],
    properties: {
      sku: { type: 'string', minLength: 1, maxLength: 100 },
      model: { type: 'string', minLength: 1, maxLength: 100 },
      brand: { type: 'string', minLength: 1, maxLength: 50 },
      type: { enum: ['AC', 'Heat Pump', 'Furnace', 'Air Handler'] },
      tonnage: { type: 'number', minimum: 0.5, maximum: 20 },
      seer: { type: 'number', minimum: 8, maximum: 30 },
      afue: { type: 'number', minimum: 80, maximum: 100 },
      hspf: { type: 'number', minimum: 6, maximum: 15 }
    },
    additionalProperties: false
  },

  batchRequest: {
    type: 'object',
    required: ['id', 'competitors', 'ourProducts', 'config', 'metadata'],
    properties: {
      id: { type: 'string', pattern: '^batch_[a-zA-Z0-9_-]+$' },
      competitors: {
        type: 'array',
        minItems: 1,
        maxItems: 100,
        items: { $ref: '#/definitions/competitor' }
      },
      ourProducts: {
        type: 'array',
        minItems: 1,
        maxItems: 1000,
        items: { $ref: '#/definitions/ourProduct' }
      },
      config: {
        type: 'object',
        required: ['maxItemsPerBatch', 'timeoutMs', 'retryAttempts'],
        properties: {
          maxItemsPerBatch: { type: 'integer', minimum: 1, maximum: 20 },
          timeoutMs: { type: 'integer', minimum: 5000, maximum: 120000 },
          retryAttempts: { type: 'integer', minimum: 0, maximum: 5 },
          cacheEnabled: { type: 'boolean' },
          validateInputs: { type: 'boolean' },
          validateOutputs: { type: 'boolean' }
        }
      },
      metadata: {
        type: 'object',
        required: ['requestTime', 'source', 'priority'],
        properties: {
          requestTime: { type: 'string', format: 'date-time' },
          source: { type: 'string', maxLength: 100 },
          priority: { enum: ['low', 'normal', 'high'] }
        }
      }
    },
    additionalProperties: false
  },

  aiResponse: {
    type: 'object',
    required: ['matches', 'metadata'],
    properties: {
      matches: {
        type: 'array',
        items: {
          type: 'object',
          required: ['idx', 'found', 'confidence'],
          properties: {
            idx: { type: 'integer', minimum: 0 },
            found: { type: 'boolean' },
            ourSku: { type: ['string', 'null'], maxLength: 100 },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            reasoning: {
              type: 'array',
              maxItems: 5,
              items: { type: 'string', maxLength: 200 }
            },
            specs: {
              type: 'object',
              properties: {
                tonnage: { type: 'number', minimum: 0.5, maximum: 20 },
                seer: { type: 'number', minimum: 8, maximum: 30 },
                type: { type: 'string', maxLength: 50 }
              }
            }
          }
        }
      },
      metadata: {
        type: 'object',
        required: ['model', 'tokensUsed', 'processingTimeMs'],
        properties: {
          model: { type: 'string', maxLength: 50 },
          tokensUsed: { type: 'integer', minimum: 0 },
          processingTimeMs: { type: 'integer', minimum: 0 }
        }
      }
    },
    additionalProperties: false
  }
} as const;

/**
 * Type guards for runtime validation
 */
export function isBatchCompetitor(obj: any): obj is BatchCompetitor {
  return (
    typeof obj === 'object' &&
    typeof obj.sku === 'string' &&
    typeof obj.company === 'string' &&
    obj.sku.length > 0 &&
    obj.company.length > 0
  );
}

export function isBatchOurProduct(obj: any): obj is BatchOurProduct {
  return (
    typeof obj === 'object' &&
    typeof obj.sku === 'string' &&
    typeof obj.model === 'string' &&
    typeof obj.brand === 'string' &&
    typeof obj.type === 'string' &&
    ['AC', 'Heat Pump', 'Furnace', 'Air Handler'].includes(obj.type)
  );
}

export function isBatchResponse(obj: any): obj is BatchResponse {
  return (
    typeof obj === 'object' &&
    typeof obj.requestId === 'string' &&
    Array.isArray(obj.results) &&
    typeof obj.metadata === 'object' &&
    typeof obj.stats === 'object'
  );
}