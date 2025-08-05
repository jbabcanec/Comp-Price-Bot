import { ExtractedProduct } from '../extraction/extraction.types';

export interface CrosswalkMatch {
  ourSku: string;
  ourModel: string;
  confidence: number;
  matchMethod: 'exact' | 'fuzzy' | 'specification' | 'ai_enhanced' | 'web_research';
  reasoning: string[];
}

export interface CrosswalkResult {
  competitorProduct: ExtractedProduct;
  matches: CrosswalkMatch[];
  bestMatch?: CrosswalkMatch;
  processingStage: 'exact' | 'fuzzy' | 'specification' | 'ai_enhanced' | 'web_research' | 'failed';
  processingSteps: string[];
  processingTime: number;
}

export interface CrosswalkBatchResult {
  batchId: string;
  sourceFile: string;
  totalProducts: number;
  processedProducts: number;
  results: CrosswalkResult[];
  summary: {
    exactMatches: number;
    fuzzyMatches: number;
    specMatches: number;
    aiMatches: number;
    webMatches: number;
    noMatches: number;
    averageConfidence: number;
  };
  processingTime: number;
  error?: string;
}

export interface TemporaryProduct {
  id: string;
  batchId: string;
  product: ExtractedProduct;
  processed: boolean;
  createdAt: Date;
}