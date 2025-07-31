/**
 * Result Normalizer Service
 * 
 * Converts output from ANY matching stage into standardized format for database storage
 * Ensures consistent data structure regardless of processing stage (exact, fuzzy, specs, AI, web)
 */

import { createHash } from 'crypto';
import { logger } from './logger.service';
import {
  StandardizedMatchResult,
  MatchDetails,
  MatchingStage,
  MatchingMethod,
  MatchFlag,
  CompetitorSpecs,
  OurProductSpecs,
  ProcessingError,
  DatabaseMatchRecord,
  ProductType,
  STANDARDIZED_MATCH_SCHEMA
} from '@shared/types/standardizedMatch.types';
import { CompetitorProduct, OurProduct } from '@shared/types/matching.types';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

export interface NormalizationContext {
  requestId: string;
  startTime: number;
  processingSteps: string[];
  fromCache: boolean;
  aiTokensUsed?: number;
  webSourcesSearched?: number;
  source: 'batch' | 'single' | 'manual';
  userId?: string;
  sessionId?: string;
}

export class ResultNormalizerService {
  private readonly ajv: any;
  private readonly validator: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    addFormats(this.ajv);
    this.validator = this.ajv.compile(STANDARDIZED_MATCH_SCHEMA);
  }

  /**
   * Normalize result from Stage 1: Exact Matching
   */
  normalizeExactMatch(
    competitor: CompetitorProduct,
    matchedProduct: OurProduct | null,
    confidence: number,
    method: 'exact_sku' | 'exact_model',
    reasoning: string[],
    context: NormalizationContext
  ): StandardizedMatchResult {
    const stage: MatchingStage = 'exact';
    
    return this.createStandardizedResult({
      competitor,
      matchedProduct,
      stage,
      method,
      confidence,
      reasoning,
      context
    });
  }

  /**
   * Normalize result from Stage 2: Fuzzy Matching
   */
  normalizeFuzzyMatch(
    competitor: CompetitorProduct,
    matchedProduct: OurProduct | null,
    confidence: number,
    method: 'fuzzy_sku' | 'fuzzy_model' | 'fuzzy_combined',
    reasoning: string[],
    context: NormalizationContext
  ): StandardizedMatchResult {
    const stage: MatchingStage = 'fuzzy';
    
    return this.createStandardizedResult({
      competitor,
      matchedProduct,
      stage,
      method,
      confidence,
      reasoning,
      context
    });
  }

  /**
   * Normalize result from Stage 3: Specification Matching
   */
  normalizeSpecificationMatch(
    competitor: CompetitorProduct,
    matchedProduct: OurProduct | null,
    confidence: number,
    method: 'spec_tonnage' | 'spec_efficiency' | 'spec_combined',
    reasoning: string[],
    context: NormalizationContext
  ): StandardizedMatchResult {
    const stage: MatchingStage = 'specification';
    
    return this.createStandardizedResult({
      competitor,
      matchedProduct,
      stage,
      method,
      confidence,
      reasoning,
      context
    });
  }

  /**
   * Normalize result from Stage 4: AI Enhanced Matching (ChatGPT)
   */
  normalizeAIMatch(
    competitor: CompetitorProduct,
    aiResponse: any, // Raw ChatGPT response
    context: NormalizationContext
  ): StandardizedMatchResult {
    const stage: MatchingStage = 'ai_enhanced';
    const method: MatchingMethod = context.source === 'batch' ? 'ai_gpt4_batch' : 'ai_gpt4';

    // Parse AI response to extract match details
    const { matchedProduct, confidence, reasoning } = this.parseAIResponse(aiResponse);

    return this.createStandardizedResult({
      competitor,
      matchedProduct,
      stage,
      method,
      confidence,
      reasoning,
      context
    });
  }

  /**
   * Normalize result from Stage 5: Web Research Matching
   */
  normalizeWebResearchMatch(
    competitor: CompetitorProduct,
    webResult: any, // Web research result
    context: NormalizationContext
  ): StandardizedMatchResult {
    const stage: MatchingStage = 'web_research';
    const method: MatchingMethod = this.determineWebMethod(webResult.source);

    const { matchedProduct, confidence, reasoning } = this.parseWebResult(webResult);

    return this.createStandardizedResult({
      competitor,
      matchedProduct,
      stage,
      method,
      confidence,
      reasoning,
      context
    });
  }

  /**
   * Normalize failed match (no match found after all stages)
   */
  normalizeFailedMatch(
    competitor: CompetitorProduct,
    finalStage: MatchingStage,
    reasoning: string[],
    context: NormalizationContext
  ): StandardizedMatchResult {
    return this.createStandardizedResult({
      competitor,
      matchedProduct: null,
      stage: 'failed',
      method: 'manual_review', // Failed matches need manual review
      confidence: 0,
      reasoning: [...reasoning, 'No match found after all stages'],
      context
    });
  }

  /**
   * Convert standardized result to database record format
   */
  toDatabaseRecord(result: StandardizedMatchResult): DatabaseMatchRecord {
    const competitorKey = this.generateCompetitorKey(
      result.competitor.sku,
      result.competitor.company
    );

    return {
      request_id: result.requestId,
      competitor_sku: result.competitor.sku,
      competitor_company: result.competitor.company,
      competitor_key: competitorKey,
      
      our_sku: result.match?.ourSku || null,
      our_model: result.match?.ourModel || null,
      our_brand: result.match?.ourBrand || null,
      our_type: result.match?.ourType || null,
      
      matching_stage: result.processing.stage,
      matching_method: result.processing.method,
      confidence: result.processing.confidence,
      reasoning: JSON.stringify(result.processing.reasoning),
      processing_steps: JSON.stringify(result.processing.processingSteps),
      from_cache: result.processing.fromCache,
      
      competitor_specs: JSON.stringify(result.competitor.specifications || {}),
      our_specs: JSON.stringify(result.match?.specifications || {}),
      
      processing_time_ms: result.processingTimeMs,
      ai_tokens_used: result.processing.aiTokensUsed || null,
      web_sources_searched: result.processing.webSourcesSearched || null,
      quality_score: result.validation.qualityScore,
      flags: JSON.stringify(result.metadata.flags),
      
      source: result.metadata.source,
      user_id: result.metadata.userId || null,
      session_id: result.metadata.sessionId || null,
      created_at: result.timestamp,
      
      competitor_price: result.competitor.price || null,
      our_price: result.match?.ourPrice || null,
      warnings: JSON.stringify(result.validation.warnings),
      
      processing_date: result.timestamp.split('T')[0] // Extract YYYY-MM-DD
    };
  }

  /**
   * Validate standardized result against schema
   */
  validateResult(result: StandardizedMatchResult): { isValid: boolean; errors: string[] } {
    const isValid = this.validator(result);
    const errors = isValid ? [] : (this.validator.errors || []).map((err: any) => 
      `${err.instancePath}: ${err.message}`
    );

    return { isValid, errors };
  }

  // Private helper methods

  private createStandardizedResult(params: {
    competitor: CompetitorProduct;
    matchedProduct: OurProduct | null;
    stage: MatchingStage;
    method: MatchingMethod;
    confidence: number;
    reasoning: string[];
    context: NormalizationContext;
  }): StandardizedMatchResult {
    const { competitor, matchedProduct, stage, method, confidence, reasoning, context } = params;
    
    const processingTime = Date.now() - context.startTime;
    const timestamp = new Date().toISOString();

    // Create match details if product found
    const match: MatchDetails | null = matchedProduct ? {
      ourSku: matchedProduct.sku,
      ourModel: matchedProduct.model,
      ourBrand: matchedProduct.brand,
      ourType: matchedProduct.type as ProductType,
      ourPrice: (matchedProduct as any).msrp || (matchedProduct as any).price,
      specifications: this.normalizeOurProductSpecs(matchedProduct),
      availability: 'in_stock' // Default - could be enhanced
    } : null;

    // Generate quality flags
    const flags = this.generateMatchFlags(confidence, stage, method, match, competitor);

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(confidence, flags, match);

    // Validate specifications consistency
    const warnings = this.generateWarnings(competitor, match);

    const result: StandardizedMatchResult = {
      requestId: context.requestId,
      timestamp,
      processingTimeMs: processingTime,
      
      competitor: {
        sku: competitor.sku,
        company: competitor.company,
        model: competitor.model,
        price: competitor.price,
        specifications: this.normalizeCompetitorSpecs(competitor)
      },
      
      match,
      
      processing: {
        stage,
        method,
        confidence,
        reasoning,
        processingSteps: context.processingSteps,
        fromCache: context.fromCache,
        aiTokensUsed: context.aiTokensUsed,
        webSourcesSearched: context.webSourcesSearched
      },
      
      validation: {
        isValid: true, // Will be validated separately
        warnings,
        qualityScore
      },
      
      metadata: {
        source: context.source,
        userId: context.userId,
        sessionId: context.sessionId,
        flags
      }
    };

    // Validate the result
    const validation = this.validateResult(result);
    const updatedResult = {
      ...result,
      validation: {
        ...result.validation,
        isValid: validation.isValid,
        warnings: validation.isValid ? result.validation.warnings : [...result.validation.warnings, ...validation.errors]
      }
    };
    
    return updatedResult;
  }

  private parseAIResponse(aiResponse: any): {
    matchedProduct: OurProduct | null;
    confidence: number;
    reasoning: string[];
  } {
    try {
      // Handle different AI response formats
      if (aiResponse.match_found === false) {
        return {
          matchedProduct: null,
          confidence: 0,
          reasoning: aiResponse.reasoning || ['AI determined no suitable match']
        };
      }

      if (aiResponse.matched_sku && aiResponse.confidence) {
        // This would need to fetch the full product details from database
        // For now, return basic structure
        return {
          matchedProduct: {
            sku: aiResponse.matched_sku,
            model: aiResponse.matched_model || '',
            brand: aiResponse.matched_brand || '',
            type: aiResponse.matched_type || 'AC'
          } as OurProduct,
          confidence: Math.min(aiResponse.confidence, 0.85), // Cap AI confidence
          reasoning: aiResponse.reasoning || ['AI-powered match']
        };
      }

      return {
        matchedProduct: null,
        confidence: 0,
        reasoning: ['Invalid AI response format']
      };

    } catch (error) {
      logger.error('result-normalizer', 'Failed to parse AI response', error as Error);
      return {
        matchedProduct: null,
        confidence: 0,
        reasoning: ['AI response parsing failed']
      };
    }
  }

  private parseWebResult(webResult: any): {
    matchedProduct: OurProduct | null;
    confidence: number;
    reasoning: string[];
  } {
    // Parse web research results
    // Implementation would depend on web research service format
    return {
      matchedProduct: null,
      confidence: 0,
      reasoning: ['Web research parsing not implemented']
    };
  }

  private determineWebMethod(source: string): MatchingMethod {
    switch (source?.toLowerCase()) {
      case 'manufacturer':
      case 'manufacturer_website':
        return 'web_manufacturer';
      case 'distributor':
      case 'distributor_catalog':
        return 'web_distributor';
      case 'ahri':
      case 'ahri_directory':
        return 'web_ahri';
      default:
        return 'web_manufacturer';
    }
  }

  private normalizeCompetitorSpecs(competitor: CompetitorProduct): CompetitorSpecs {
    const specs = competitor.specifications || {};
    
    return {
      tonnage: this.parseNumeric(specs.tonnage),
      seer: this.parseNumeric(specs.seer),
      eer: this.parseNumeric(specs.eer),
      afue: this.parseNumeric(specs.afue),
      hspf: this.parseNumeric(specs.hspf),
      cop: this.parseNumeric(specs.cop),
      refrigerant: specs.refrigerant,
      voltage: this.parseNumeric(specs.voltage),
      phase: this.parseNumeric(specs.phase),
      productType: specs.product_type || specs.type,
      application: this.normalizeApplication(specs.application),
      features: Array.isArray(specs.features) ? specs.features : undefined
    };
  }

  private normalizeOurProductSpecs(product: OurProduct): OurProductSpecs {
    return {
      tonnage: product.tonnage,
      seer: product.seer,
      seer2: product.seer2,
      eer: undefined, // Not in our product schema
      afue: product.afue,
      hspf: product.hspf,
      hspf2: undefined, // Not in our product schema
      cop: undefined, // Not in our product schema
      refrigerant: product.refrigerant,
      voltage: undefined, // Not in our product schema
      phase: undefined, // Not in our product schema
      stage: this.normalizeStage(product.stage),
      certifications: undefined // Not in our product schema
    };
  }

  private generateMatchFlags(
    confidence: number,
    stage: MatchingStage,
    method: MatchingMethod,
    match: MatchDetails | null,
    competitor: CompetitorProduct
  ): MatchFlag[] {
    const flags: MatchFlag[] = [];

    // Confidence flags
    if (confidence >= 0.9) flags.push('high_confidence');
    else if (confidence >= 0.7) flags.push('medium_confidence');
    else if (confidence >= 0.5) flags.push('low_confidence');
    else flags.push('needs_review');

    // Stage-specific flags
    if (stage === 'ai_enhanced') flags.push('ai_generated');
    if (stage === 'web_research') flags.push('web_verified');
    if (method === 'cached_result') flags.push('cache_hit');

    // Quality flags
    if (confidence < 0.7) flags.push('requires_approval');
    if (!match) flags.push('needs_review');

    // Price consistency (if both prices available)
    if (match?.ourPrice && competitor.price) {
      const priceDiff = Math.abs(match.ourPrice - competitor.price) / competitor.price;
      if (priceDiff > 0.3) flags.push('price_mismatch');
    }

    return flags;
  }

  private calculateQualityScore(
    confidence: number,
    flags: MatchFlag[],
    match: MatchDetails | null
  ): number {
    let score = confidence;

    // Adjust based on flags
    if (flags.includes('high_confidence')) score += 0.05;
    if (flags.includes('needs_review')) score -= 0.2;
    if (flags.includes('price_mismatch')) score -= 0.1;
    if (flags.includes('web_verified')) score += 0.05;

    // Adjust based on match completeness
    if (match) {
      if (match.specifications.tonnage) score += 0.02;
      if (match.specifications.seer) score += 0.02;
      if (match.specifications.refrigerant) score += 0.01;
    }

    return Math.max(0, Math.min(1, score));
  }

  private generateWarnings(competitor: CompetitorProduct, match: MatchDetails | null): string[] {
    const warnings: string[] = [];

    if (!match) {
      warnings.push('No match found - requires manual review');
      return warnings;
    }

    // Check specification consistency
    const compSpecs = competitor.specifications;
    const ourSpecs = match.specifications;

    if (compSpecs?.tonnage && ourSpecs?.tonnage) {
      const tonnageDiff = Math.abs(compSpecs.tonnage - ourSpecs.tonnage) / ourSpecs.tonnage;
      if (tonnageDiff > 0.1) {
        warnings.push(`Tonnage mismatch: ${compSpecs.tonnage} vs ${ourSpecs.tonnage}`);
      }
    }

    if (compSpecs?.seer && ourSpecs?.seer) {
      const seerDiff = Math.abs(compSpecs.seer - ourSpecs.seer) / ourSpecs.seer;
      if (seerDiff > 0.15) {
        warnings.push(`SEER rating difference: ${compSpecs.seer} vs ${ourSpecs.seer}`);
      }
    }

    return warnings;
  }

  private generateCompetitorKey(sku: string, company: string): string {
    return createHash('md5').update(`${sku.toUpperCase()}_${company.toUpperCase()}`).digest('hex');
  }

  private parseNumeric(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private normalizeApplication(app: any): 'residential' | 'commercial' | 'industrial' | undefined {
    if (!app) return undefined;
    const normalized = app.toString().toLowerCase();
    if (normalized.includes('residential') || normalized.includes('home')) return 'residential';
    if (normalized.includes('commercial') || normalized.includes('business')) return 'commercial';
    if (normalized.includes('industrial')) return 'industrial';
    return undefined;
  }

  private normalizeStage(stage: any): 'single' | 'two-stage' | 'variable' | undefined {
    if (!stage) return undefined;
    const normalized = stage.toString().toLowerCase();
    if (normalized.includes('two') || normalized === '2') return 'two-stage';
    if (normalized.includes('variable') || normalized.includes('var')) return 'variable';
    if (normalized.includes('single') || normalized === '1') return 'single';
    return undefined;
  }
}