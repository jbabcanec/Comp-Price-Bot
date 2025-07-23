/**
 * HVAC SKU Crosswalk Matching Engine
 * Orchestrates multiple matching strategies to find equivalent products
 */

import { 
  CompetitorProduct, 
  OurProduct, 
  MatchResult, 
  MatchingOptions,
  MatchingRequest,
  MatchingResponse,
  MatchingStats,
  MatchMethod
} from '@shared/types/matching.types';

import { ExactMatchStrategy } from './strategies/exact.strategy';
import { ModelMatchStrategy } from './strategies/model.strategy';
import { SpecificationMatchStrategy } from './strategies/specs.strategy';
import { ConfidenceScorer } from './confidence.scorer';

export interface MatchingStrategy {
  getName(): string;
  getDescription(): string;
  canHandle(competitorProduct: CompetitorProduct): boolean;
  getConfidenceRange(): { min: number; max: number };
  findMatches(
    competitorProduct: CompetitorProduct,
    ourProducts: OurProduct[],
    options: MatchingOptions
  ): Promise<MatchResult[]>;
}

export class CrosswalkMatchingEngine {
  private strategies: Map<MatchMethod, MatchingStrategy>;
  private confidenceScorer: ConfidenceScorer;
  private stats: MatchingStats;

  constructor() {
    this.strategies = new Map();
    this.confidenceScorer = new ConfidenceScorer();
    this.stats = this.initializeStats();
    
    this.registerStrategies();
  }

  /**
   * Register all available matching strategies
   */
  private registerStrategies(): void {
    const exactStrategy = new ExactMatchStrategy();
    const modelStrategy = new ModelMatchStrategy();
    const specStrategy = new SpecificationMatchStrategy();

    this.strategies.set('exact_sku', exactStrategy);
    this.strategies.set('exact_model', exactStrategy);
    this.strategies.set('model_fuzzy', modelStrategy);
    this.strategies.set('specifications', specStrategy);
  }

  /**
   * Main matching function - finds best matches for competitor product
   */
  async findMatches(request: MatchingRequest): Promise<MatchingResponse> {
    const startTime = Date.now();
    const { competitorProduct, ourProducts, options } = request;

    try {
      // 1. Check for existing mappings first
      const existingMatch = await this.checkExistingMapping(competitorProduct);
      if (existingMatch) {
        const processingTime = Date.now() - startTime;
        this.updateStats('existing_mapping', [existingMatch], processingTime);
        
        return {
          competitorProduct,
          matches: [existingMatch],
          processingTime,
          totalCandidates: ourProducts.length,
          strategiesUsed: ['existing_mapping'],
          confidence: this.confidenceScorer.getConfidenceLevel(existingMatch.confidence)
        };
      }

      // 2. Run enabled matching strategies
      const allMatches: MatchResult[] = [];
      const usedStrategies: MatchMethod[] = [];

      for (const method of options.enabledStrategies) {
        const strategy = this.strategies.get(method);
        if (!strategy) continue;

        if (strategy.canHandle(competitorProduct)) {
          try {
            const matches = await strategy.findMatches(competitorProduct, ourProducts, options);
            allMatches.push(...matches);
            if (matches.length > 0) {
              usedStrategies.push(method);
            }
          } catch (error) {
            console.warn(`Strategy ${method} failed:`, error);
          }
        }
      }

      // 3. Combine and score matches
      const combinedMatches = this.confidenceScorer.combineMultipleMatches(
        allMatches,
        competitorProduct
      );

      // 4. Filter by confidence threshold and limit results
      const finalMatches = combinedMatches
        .filter(match => match.confidence >= options.confidenceThreshold)
        .slice(0, options.maxResults);

      const processingTime = Date.now() - startTime;
      const bestConfidence = finalMatches.length > 0 ? 
        this.confidenceScorer.getConfidenceLevel(finalMatches[0].confidence) : 'none';

      // Update statistics
      this.updateStats(usedStrategies[0] || 'specifications', finalMatches, processingTime);

      return {
        competitorProduct,
        matches: finalMatches,
        processingTime,
        totalCandidates: ourProducts.length,
        strategiesUsed: usedStrategies,
        confidence: bestConfidence
      };

    } catch (error) {
      console.error('Matching engine error:', error);
      const processingTime = Date.now() - startTime;
      
      return {
        competitorProduct,
        matches: [],
        processingTime,
        totalCandidates: ourProducts.length,
        strategiesUsed: [],
        confidence: 'none'
      };
    }
  }

  /**
   * Batch process multiple competitor products
   */
  async batchProcess(
    competitorProducts: CompetitorProduct[],
    ourProducts: OurProduct[],
    options: MatchingOptions,
    progressCallback?: (progress: { current: number; total: number; product: CompetitorProduct }) => void
  ): Promise<MatchingResponse[]> {
    const results: MatchingResponse[] = [];
    
    for (let i = 0; i < competitorProducts.length; i++) {
      const competitorProduct = competitorProducts[i];
      
      // Report progress
      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: competitorProducts.length,
          product: competitorProduct
        });
      }

      try {
        const result = await this.findMatches({
          competitorProduct,
          ourProducts,
          options
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to process product ${competitorProduct.sku}:`, error);
        results.push({
          competitorProduct,
          matches: [],
          processingTime: 0,
          totalCandidates: ourProducts.length,
          strategiesUsed: [],
          confidence: 'none'
        });
      }

      // Small delay to prevent overwhelming the system
      if (i < competitorProducts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return results;
  }

  /**
   * Check for existing mapping in database/cache
   */
  private async checkExistingMapping(
    competitorProduct: CompetitorProduct
  ): Promise<MatchResult | null> {
    // TODO: Implement database lookup for existing mappings
    // This would query the crosswalk_mappings table for verified matches
    
    // For now, return null (no existing mapping)
    return null;
  }

  /**
   * Get default matching options
   */
  getDefaultOptions(): MatchingOptions {
    return {
      enabledStrategies: ['exact_sku', 'exact_model', 'model_fuzzy', 'specifications'],
      confidenceThreshold: 0.5,
      maxResults: 10,
      useAI: false,
      strictMode: false,
      specifications: {
        tonnageTolerance: 0.5,        // ±0.5 tons
        seerTolerance: 2.0,           // ±2 SEER points
        afueTolerance: 2.0,           // ±2% AFUE
        hspfTolerance: 0.5            // ±0.5 HSPF points
      }
    };
  }

  /**
   * Get strict matching options (higher thresholds)
   */
  getStrictOptions(): MatchingOptions {
    return {
      ...this.getDefaultOptions(),
      confidenceThreshold: 0.75,
      maxResults: 5,
      strictMode: true,
      specifications: {
        tonnageTolerance: 0.25,       // ±0.25 tons
        seerTolerance: 1.0,           // ±1 SEER point
        afueTolerance: 1.0,           // ±1% AFUE
        hspfTolerance: 0.25           // ±0.25 HSPF points
      }
    };
  }

  /**
   * Get permissive matching options (lower thresholds)
   */
  getPermissiveOptions(): MatchingOptions {
    return {
      ...this.getDefaultOptions(),
      confidenceThreshold: 0.3,
      maxResults: 20,
      specifications: {
        tonnageTolerance: 1.0,        // ±1 ton
        seerTolerance: 3.0,           // ±3 SEER points
        afueTolerance: 5.0,           // ±5% AFUE
        hspfTolerance: 1.0            // ±1 HSPF point
      }
    };
  }

  /**
   * Get available strategies
   */
  getAvailableStrategies(): Array<{ method: MatchMethod; name: string; description: string }> {
    const strategies: Array<{ method: MatchMethod; name: string; description: string }> = [];
    
    for (const [method, strategy] of this.strategies.entries()) {
      strategies.push({
        method,
        name: strategy.getName(),
        description: strategy.getDescription()
      });
    }

    return strategies.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStats(): MatchingStats {
    return {
      totalProcessed: 0,
      exactMatches: 0,
      fuzzyMatches: 0,
      specMatches: 0,
      aiMatches: 0,
      noMatches: 0,
      averageConfidence: 0,
      averageProcessingTime: 0,
      strategiesUsage: {
        'exact_sku': 0,
        'exact_model': 0,
        'model_fuzzy': 0,
        'specifications': 0,
        'ai_enhanced': 0,
        'hybrid': 0,
        'existing_mapping': 0
      }
    };
  }

  /**
   * Update statistics after processing
   */
  private updateStats(primaryMethod: MatchMethod, matches: MatchResult[], processingTime: number): void {
    this.stats.totalProcessed++;
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1) + processingTime) / 
      this.stats.totalProcessed;

    if (matches.length === 0) {
      this.stats.noMatches++;
      return;
    }

    // Update strategy usage
    this.stats.strategiesUsage[primaryMethod]++;

    // Categorize match types
    const bestMatch = matches[0];
    switch (bestMatch.matchMethod) {
      case 'exact_sku':
      case 'exact_model':
      case 'existing_mapping':
        this.stats.exactMatches++;
        break;
      case 'model_fuzzy':
        this.stats.fuzzyMatches++;
        break;
      case 'specifications':
        this.stats.specMatches++;
        break;
      case 'ai_enhanced':
        this.stats.aiMatches++;
        break;
    }

    // Update average confidence
    const avgMatchConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length;
    this.stats.averageConfidence = 
      (this.stats.averageConfidence * (this.stats.totalProcessed - 1) + avgMatchConfidence) / 
      this.stats.totalProcessed;
  }

  /**
   * Get current matching statistics
   */
  getStats(): MatchingStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Validate competitor product before processing
   */
  validateCompetitorProduct(product: CompetitorProduct): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!product.sku || product.sku.trim().length === 0) {
      errors.push('SKU is required');
    }

    if (!product.company || product.company.trim().length === 0) {
      errors.push('Company name is required');
    }

    if (product.price !== undefined && (product.price < 0 || product.price > 50000)) {
      errors.push('Price must be between $0 and $50,000');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get matching suggestions for configuration
   */
  getSuggestedOptions(competitorProducts: CompetitorProduct[]): MatchingOptions {
    const options = this.getDefaultOptions();
    
    // Analyze the competitor products to suggest optimal settings
    const hasDescriptions = competitorProducts.some(p => p.description && p.description.length > 10);
    const hasSpecs = competitorProducts.some(p => p.specifications && Object.keys(p.specifications).length > 0);
    const hasModels = competitorProducts.some(p => p.model && p.model.length > 3);

    // Adjust strategies based on available data
    if (!hasDescriptions && !hasSpecs) {
      // Limited data - focus on exact and model matching
      options.enabledStrategies = ['exact_sku', 'exact_model', 'model_fuzzy'];
      options.confidenceThreshold = 0.6;
    } else if (hasSpecs) {
      // Rich data - use all strategies
      options.enabledStrategies = ['exact_sku', 'exact_model', 'model_fuzzy', 'specifications'];
      options.confidenceThreshold = 0.4;
    }

    return options;
  }

  /**
   * Export matching results to various formats
   */
  async exportResults(
    results: MatchingResponse[],
    format: 'csv' | 'json' | 'xlsx' = 'csv'
  ): Promise<string | object> {
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);
      
      case 'csv':
        return this.convertToCSV(results);
      
      case 'xlsx':
        // TODO: Implement Excel export
        throw new Error('Excel export not yet implemented');
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Convert results to CSV format
   */
  private convertToCSV(results: MatchingResponse[]): string {
    const headers = [
      'Competitor SKU',
      'Competitor Company', 
      'Competitor Price',
      'Our SKU',
      'Our Model',
      'Confidence',
      'Match Method',
      'Processing Time (ms)'
    ];

    const rows = results.flatMap(result => {
      if (result.matches.length === 0) {
        return [[
          result.competitorProduct.sku,
          result.competitorProduct.company,
          result.competitorProduct.price || '',
          'NO MATCH',
          '',
          '0%',
          'none',
          result.processingTime
        ]];
      }

      return result.matches.map(match => [
        result.competitorProduct.sku,
        result.competitorProduct.company,
        result.competitorProduct.price || '',
        match.ourSku,
        match.ourProduct.model,
        `${(match.confidence * 100).toFixed(1)}%`,
        match.matchMethod,
        result.processingTime
      ]);
    });

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}