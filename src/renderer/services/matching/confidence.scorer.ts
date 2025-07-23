/**
 * Confidence Scoring Algorithm
 * Combines results from multiple matching strategies to provide overall confidence
 */

import { 
  MatchResult, 
  MatchMethod,
  CompetitorProduct,
  OurProduct 
} from '@shared/types/matching.types';

export interface ConfidenceWeights {
  exact: number;
  model: number;
  specifications: number;
  productTypeMatch: number;
  brandCompatibility: number;
  priceReasonableness: number;
}

export interface ConfidenceFactors {
  hasExactMatch: boolean;
  hasModelMatch: boolean;
  hasSpecMatch: boolean;
  productTypesMatch: boolean;
  brandsCompatible: boolean;
  priceReasonable: boolean;
  specMatchCount: number;
  totalSpecsCompared: number;
}

export class ConfidenceScorer {
  
  private readonly defaultWeights: ConfidenceWeights = {
    exact: 1.0,              // Exact matches get full weight
    model: 0.85,             // Model matches are very reliable
    specifications: 0.90,    // Spec matches are highly reliable for HVAC
    productTypeMatch: 0.15,  // Bonus for matching product types
    brandCompatibility: 0.10, // Small bonus for compatible brands
    priceReasonableness: 0.05 // Small bonus for reasonable pricing
  };

  /**
   * Calculate overall confidence score for a match result
   */
  calculateConfidence(
    matchResult: MatchResult,
    competitorProduct: CompetitorProduct,
    weights: Partial<ConfidenceWeights> = {}
  ): number {
    const finalWeights = { ...this.defaultWeights, ...weights };
    const factors = this.analyzeConfidenceFactors(matchResult, competitorProduct);
    
    let baseScore = 0;
    let maxPossibleScore = 0;

    // Base matching strategy score
    const strategyScore = matchResult.score?.overall || matchResult.confidence;
    const strategyWeight = this.getStrategyWeight(matchResult.matchMethod, finalWeights);
    
    baseScore += strategyScore * strategyWeight;
    maxPossibleScore += strategyWeight;

    // Product type compatibility bonus
    if (factors.productTypesMatch) {
      baseScore += finalWeights.productTypeMatch;
    }
    maxPossibleScore += finalWeights.productTypeMatch;

    // Brand compatibility bonus
    if (factors.brandsCompatible) {
      baseScore += finalWeights.brandCompatibility;
    }
    maxPossibleScore += finalWeights.brandCompatibility;

    // Price reasonableness bonus
    if (factors.priceReasonable) {
      baseScore += finalWeights.priceReasonableness;
    }
    maxPossibleScore += finalWeights.priceReasonableness;

    // Apply penalties for poor matches
    const penaltyFactor = this.calculatePenaltyFactor(factors);
    baseScore *= penaltyFactor;

    // Normalize to 0-1 range
    const normalizedScore = maxPossibleScore > 0 ? baseScore / maxPossibleScore : 0;
    
    return Math.max(0, Math.min(1, normalizedScore));
  }

  /**
   * Combine confidence scores from multiple strategies
   */
  combineMultipleMatches(
    matches: MatchResult[],
    competitorProduct: CompetitorProduct,
    weights: Partial<ConfidenceWeights> = {}
  ): MatchResult[] {
    if (matches.length === 0) return [];

    // Group matches by our SKU
    const matchGroups = this.groupMatchesBySku(matches);
    
    const combinedMatches: MatchResult[] = [];

    for (const [ourSku, skuMatches] of matchGroups.entries()) {
      const combinedMatch = this.combineMatchesForSku(
        skuMatches, 
        competitorProduct,
        weights
      );
      combinedMatches.push(combinedMatch);
    }

    // Sort by final confidence score
    return combinedMatches
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Analyze factors that affect confidence
   */
  private analyzeConfidenceFactors(
    matchResult: MatchResult,
    competitorProduct: CompetitorProduct
  ): ConfidenceFactors {
    return {
      hasExactMatch: matchResult.matchMethod === 'exact_sku' || matchResult.matchMethod === 'exact_model',
      hasModelMatch: matchResult.matchMethod === 'model_fuzzy',
      hasSpecMatch: matchResult.matchMethod === 'specifications',
      productTypesMatch: this.checkProductTypeMatch(competitorProduct, matchResult.ourProduct),
      brandsCompatible: this.checkBrandCompatibility(competitorProduct, matchResult.ourProduct),
      priceReasonable: this.checkPriceReasonableness(competitorProduct, matchResult.ourProduct),
      specMatchCount: matchResult.specifications?.matched.length || 0,
      totalSpecsCompared: (matchResult.specifications?.matched.length || 0) + 
                         (matchResult.specifications?.mismatched.length || 0)
    };
  }

  /**
   * Get weight for specific matching strategy
   */
  private getStrategyWeight(method: MatchMethod, weights: ConfidenceWeights): number {
    switch (method) {
      case 'exact_sku':
      case 'exact_model':
        return weights.exact;
      case 'model_fuzzy':
        return weights.model;
      case 'specifications':
        return weights.specifications;
      case 'existing_mapping':
        return 1.0; // Existing mappings are fully trusted
      default:
        return 0.5; // Unknown methods get moderate weight
    }
  }

  /**
   * Calculate penalty factor for poor matches
   */
  private calculatePenaltyFactor(factors: ConfidenceFactors): number {
    let penalty = 1.0;

    // Penalty for product type mismatch
    if (!factors.productTypesMatch && factors.totalSpecsCompared > 0) {
      penalty *= 0.8;
    }

    // Penalty for incompatible brands (only if no other strong signals)
    if (!factors.brandsCompatible && !factors.hasExactMatch && !factors.hasSpecMatch) {
      penalty *= 0.9;
    }

    // Penalty for unreasonable pricing
    if (!factors.priceReasonable) {
      penalty *= 0.95;
    }

    // Penalty for low specification match ratio
    if (factors.totalSpecsCompared > 0) {
      const specMatchRatio = factors.specMatchCount / factors.totalSpecsCompared;
      if (specMatchRatio < 0.5) {
        penalty *= 0.7 + (specMatchRatio * 0.3);
      }
    }

    return penalty;
  }

  /**
   * Check if product types are compatible
   */
  private checkProductTypeMatch(
    competitorProduct: CompetitorProduct,
    ourProduct: OurProduct
  ): boolean {
    const competitorText = (competitorProduct.description || '').toLowerCase();
    const ourType = ourProduct.type.toLowerCase();

    // HVAC product type matching
    const typeMatches: Record<string, string[]> = {
      'furnace': ['furnace', 'heating', 'gas heat', 'warm air', 'gas unit'],
      'heat_pump': ['heat pump', 'hp', 'heating cooling', 'dual fuel', 'heat/cool'],
      'air_conditioner': ['air condition', 'ac ', 'cooling', 'condenser', 'cool only'],
      'ahu': ['air handler', 'ahu', 'air handling', 'fan coil', 'indoor unit'],
      'coil': ['coil', 'evaporator', 'condenser coil', 'indoor coil'],
      'other': ['accessory', 'part', 'component', 'control']
    };

    const ourTypeKeywords = typeMatches[ourType] || [ourType];
    
    return ourTypeKeywords.some(keyword => 
      competitorText.includes(keyword) || keyword.includes(ourType)
    );
  }

  /**
   * Check if brands are compatible (same manufacturer family)
   */
  private checkBrandCompatibility(
    competitorProduct: CompetitorProduct,
    ourProduct: OurProduct
  ): boolean {
    const competitorCompany = competitorProduct.company.toLowerCase();
    const ourBrand = ourProduct.brand.toLowerCase();

    // Same brand is always compatible
    if (competitorCompany.includes(ourBrand) || ourBrand.includes(competitorCompany)) {
      return true;
    }

    // Brand family groupings (companies that share platforms)
    const brandFamilies = [
      ['trane', 'american standard'],
      ['carrier', 'bryant', 'payne'],
      ['lennox', 'ducane'],
      ['goodman', 'amana', 'daikin'],
      ['rheem', 'ruud'],
      ['york', 'luxaire', 'champion']
    ];

    for (const family of brandFamilies) {
      const competitorInFamily = family.some(brand => competitorCompany.includes(brand));
      const ourInFamily = family.some(brand => ourBrand.includes(brand));
      
      if (competitorInFamily && ourInFamily) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if pricing seems reasonable for the match
   */
  private checkPriceReasonableness(
    competitorProduct: CompetitorProduct,
    ourProduct: OurProduct
  ): boolean {
    if (!competitorProduct.price) {
      return true; // No price data, can't determine unreasonableness
    }

    // Basic price reasonableness check based on product type and tonnage
    const price = competitorProduct.price;
    const tonnage = ourProduct.tonnage || 3; // Default to 3 ton if unknown
    const type = ourProduct.type.toLowerCase();

    // Expected price ranges per ton by product type (rough estimates)
    const priceRanges: Record<string, { min: number; max: number }> = {
      'furnace': { min: 800, max: 3000 },
      'heat_pump': { min: 1200, max: 4000 },
      'air_conditioner': { min: 1000, max: 3500 },
      'ahu': { min: 500, max: 2000 },
      'coil': { min: 200, max: 1000 },
      'other': { min: 50, max: 1500 }
    };

    const range = priceRanges[type] || { min: 100, max: 5000 };
    const expectedMin = range.min * tonnage;
    const expectedMax = range.max * tonnage;

    // Allow for some variance beyond the expected range
    const minReasonable = expectedMin * 0.5;
    const maxReasonable = expectedMax * 2.0;

    return price >= minReasonable && price <= maxReasonable;
  }

  /**
   * Group matches by our SKU
   */
  private groupMatchesBySku(matches: MatchResult[]): Map<string, MatchResult[]> {
    const groups = new Map<string, MatchResult[]>();
    
    for (const match of matches) {
      const existing = groups.get(match.ourSku) || [];
      existing.push(match);
      groups.set(match.ourSku, existing);
    }
    
    return groups;
  }

  /**
   * Combine multiple matches for the same SKU
   */
  private combineMatchesForSku(
    matches: MatchResult[],
    competitorProduct: CompetitorProduct,
    weights: Partial<ConfidenceWeights>
  ): MatchResult {
    if (matches.length === 1) {
      const match = matches[0];
      match.confidence = this.calculateConfidence(match, competitorProduct, weights);
      return match;
    }

    // Find the best match by strategy priority
    const prioritizedMatches = matches.sort((a, b) => {
      const aPriority = this.getMethodPriority(a.matchMethod);
      const bPriority = this.getMethodPriority(b.matchMethod);
      if (aPriority !== bPriority) return bPriority - aPriority;
      return b.confidence - a.confidence;
    });

    const primaryMatch = prioritizedMatches[0];
    
    // Combine reasoning from all matches
    const allReasoning = matches.flatMap(m => m.reasoning);
    const uniqueReasoning = [...new Set(allReasoning)];

    // Combine specifications
    const allMatched = matches.flatMap(m => m.specifications?.matched || []);
    const allMismatched = matches.flatMap(m => m.specifications?.mismatched || []);
    const allMissing = matches.flatMap(m => m.specifications?.missing || []);

    // Calculate combined confidence
    const combinedConfidence = this.calculateConfidence(primaryMatch, competitorProduct, weights);

    // Create hybrid match method if multiple strategies contributed
    const methods = [...new Set(matches.map(m => m.matchMethod))];
    const matchMethod: MatchMethod = methods.length > 1 ? 'hybrid' : primaryMatch.matchMethod;

    return {
      ...primaryMatch,
      confidence: combinedConfidence,
      matchMethod,
      reasoning: uniqueReasoning,
      specifications: {
        matched: [...new Set(allMatched)],
        mismatched: [...new Set(allMismatched)],
        missing: [...new Set(allMissing)]
      },
      score: {
        exact: Math.max(...matches.map(m => m.score?.exact || 0)),
        model: Math.max(...matches.map(m => m.score?.model || 0)),
        specifications: Math.max(...matches.map(m => m.score?.specifications || 0)),
        overall: combinedConfidence
      }
    };
  }

  /**
   * Get priority for match methods (higher = better)
   */
  private getMethodPriority(method: MatchMethod): number {
    const priorities: Record<MatchMethod, number> = {
      'exact_sku': 10,
      'exact_model': 9,
      'existing_mapping': 8,
      'specifications': 7,
      'model_fuzzy': 6,
      'hybrid': 5,
      'ai_enhanced': 4
    };
    
    return priorities[method] || 0;
  }

  /**
   * Get confidence level description
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' | 'none' {
    if (confidence >= 0.85) return 'high';
    if (confidence >= 0.65) return 'medium';
    if (confidence >= 0.45) return 'low';
    return 'none';
  }

  /**
   * Get human-readable confidence explanation
   */
  getConfidenceExplanation(
    matchResult: MatchResult,
    competitorProduct: CompetitorProduct
  ): string {
    const factors = this.analyzeConfidenceFactors(matchResult, competitorProduct);
    const level = this.getConfidenceLevel(matchResult.confidence);
    
    const explanations: string[] = [];
    
    // Primary match type
    switch (matchResult.matchMethod) {
      case 'exact_sku':
      case 'exact_model':
        explanations.push('Exact match found');
        break;
      case 'specifications':
        explanations.push(`${factors.specMatchCount}/${factors.totalSpecsCompared} specifications matched`);
        break;
      case 'model_fuzzy':
        explanations.push('Model number similarity detected');
        break;
    }

    // Additional factors
    if (factors.productTypesMatch) {
      explanations.push('Product types are compatible');
    }
    if (factors.brandsCompatible) {
      explanations.push('Brands are in same family');
    }
    if (!factors.priceReasonable) {
      explanations.push('Price may be outside normal range');
    }

    return `${level.toUpperCase()} confidence (${(matchResult.confidence * 100).toFixed(0)}%): ${explanations.join(', ')}`;
  }
}