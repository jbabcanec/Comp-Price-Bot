/**
 * Exact Match Strategy
 * Performs exact string matching for SKUs and model numbers
 */

import { 
  CompetitorProduct, 
  OurProduct, 
  MatchResult, 
  MatchingOptions 
} from '@shared/types/matching.types';

export class ExactMatchStrategy {
  
  /**
   * Find exact matches for competitor product
   */
  async findMatches(
    competitorProduct: CompetitorProduct, 
    ourProducts: OurProduct[], 
    options: MatchingOptions
  ): Promise<MatchResult[]> {
    const matches: MatchResult[] = [];

    // 1. Exact SKU match (highest confidence)
    const skuMatches = this.findExactSKUMatches(competitorProduct, ourProducts);
    matches.push(...skuMatches);

    // 2. Exact model match (high confidence)
    if (competitorProduct.model) {
      const modelMatches = this.findExactModelMatches(competitorProduct, ourProducts);
      matches.push(...modelMatches);
    }

    // Remove duplicates and sort by confidence
    const uniqueMatches = this.removeDuplicateMatches(matches);
    return uniqueMatches
      .filter(match => match.confidence >= options.confidenceThreshold)
      .slice(0, options.maxResults);
  }

  /**
   * Find products with exactly matching SKUs
   */
  private findExactSKUMatches(
    competitorProduct: CompetitorProduct, 
    ourProducts: OurProduct[]
  ): MatchResult[] {
    const matches: MatchResult[] = [];
    const competitorSKU = this.normalizeSKU(competitorProduct.sku);

    for (const ourProduct of ourProducts) {
      const ourSKU = this.normalizeSKU(ourProduct.sku);

      if (competitorSKU === ourSKU) {
        matches.push({
          ourSku: ourProduct.sku,
          ourProduct,
          confidence: 0.98, // Very high confidence for exact SKU match
          matchMethod: 'exact_sku',
          reasoning: [
            `Exact SKU match: "${competitorProduct.sku}" = "${ourProduct.sku}"`
          ],
          score: {
            exact: 1.0,
            model: 0.0,
            specifications: 0.0,
            overall: 0.98
          }
        });
      }
    }

    return matches;
  }

  /**
   * Find products with exactly matching model numbers
   */
  private findExactModelMatches(
    competitorProduct: CompetitorProduct, 
    ourProducts: OurProduct[]
  ): MatchResult[] {
    const matches: MatchResult[] = [];
    const competitorModel = this.normalizeModel(competitorProduct.model!);

    for (const ourProduct of ourProducts) {
      const ourModel = this.normalizeModel(ourProduct.model);

      if (competitorModel === ourModel && competitorModel.length > 0) {
        // Additional validation: check if products are similar types
        const typeCompatible = this.areTypesCompatible(
          competitorProduct, 
          ourProduct
        );

        const confidence = typeCompatible ? 0.90 : 0.75;

        matches.push({
          ourSku: ourProduct.sku,
          ourProduct,
          confidence,
          matchMethod: 'exact_model',
          reasoning: [
            `Exact model match: "${competitorProduct.model}" = "${ourProduct.model}"`,
            ...(typeCompatible ? [] : ['Warning: Product types may differ'])
          ],
          score: {
            exact: 1.0,
            model: 1.0,
            specifications: 0.0,
            overall: confidence
          }
        });
      }
    }

    return matches;
  }

  /**
   * Normalize SKU for comparison
   */
  private normalizeSKU(sku: string): string {
    return sku
      .toUpperCase()
      .trim()
      .replace(/[-\s_]/g, '')  // Remove separators
      .replace(/[^A-Z0-9]/g, ''); // Keep only alphanumeric
  }

  /**
   * Normalize model number for comparison
   */
  private normalizeModel(model: string): string {
    return model
      .toUpperCase()
      .trim()
      .replace(/[-\s_]/g, '')
      .replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Check if two products are compatible types
   */
  private areTypesCompatible(
    competitorProduct: CompetitorProduct, 
    ourProduct: OurProduct
  ): boolean {
    // If we don't have type info, assume compatible
    if (!competitorProduct.description && !ourProduct.type) {
      return true;
    }

    const competitorText = (competitorProduct.description || '').toLowerCase();
    const ourType = ourProduct.type.toLowerCase();

    // HVAC product type matching
    const typeMatches: Record<string, string[]> = {
      'furnace': ['furnace', 'heating', 'gas heat', 'warm air'],
      'heat_pump': ['heat pump', 'hp', 'heating cooling', 'dual fuel'],
      'air_conditioner': ['air condition', 'ac', 'cooling', 'condenser'],
      'ahu': ['air handler', 'ahu', 'air handling', 'fan coil'],
      'coil': ['coil', 'evaporator', 'condenser coil'],
      'other': ['accessory', 'part', 'component']
    };

    const ourTypeKeywords = typeMatches[ourType] || [ourType];
    
    return ourTypeKeywords.some(keyword => 
      competitorText.includes(keyword) || keyword.includes(ourType)
    );
  }

  /**
   * Remove duplicate matches (same our_sku)
   */
  private removeDuplicateMatches(matches: MatchResult[]): MatchResult[] {
    const seen = new Set<string>();
    const uniqueMatches: MatchResult[] = [];

    // Sort by confidence first to keep the best match
    const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);

    for (const match of sortedMatches) {
      if (!seen.has(match.ourSku)) {
        seen.add(match.ourSku);
        uniqueMatches.push(match);
      }
    }

    return uniqueMatches;
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return 'exact_match';
  }

  /**
   * Get strategy description
   */
  getDescription(): string {
    return 'Finds exact matches based on SKU and model number comparison';
  }

  /**
   * Check if strategy can handle the given product
   */
  canHandle(competitorProduct: CompetitorProduct): boolean {
    return !!(competitorProduct.sku || competitorProduct.model);
  }

  /**
   * Get expected confidence range for this strategy
   */
  getConfidenceRange(): { min: number; max: number } {
    return { min: 0.75, max: 0.98 };
  }
}