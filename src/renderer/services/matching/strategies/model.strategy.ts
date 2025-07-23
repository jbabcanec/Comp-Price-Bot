/**
 * Model Number Matching Strategy
 * Performs fuzzy matching on model numbers using various algorithms
 */

import { 
  CompetitorProduct, 
  OurProduct, 
  MatchResult, 
  MatchingOptions,
  ModelComparison 
} from '@shared/types/matching.types';

export class ModelMatchStrategy {
  
  /**
   * Find fuzzy matches based on model numbers
   */
  async findMatches(
    competitorProduct: CompetitorProduct, 
    ourProducts: OurProduct[], 
    options: MatchingOptions
  ): Promise<MatchResult[]> {
    if (!competitorProduct.sku && !competitorProduct.model) {
      return [];
    }

    const matches: MatchResult[] = [];
    const searchTerms = this.extractSearchTerms(competitorProduct);

    for (const ourProduct of ourProducts) {
      const comparison = this.compareModels(searchTerms, ourProduct);
      
      if (comparison.confidence >= options.confidenceThreshold) {
        const match = this.createMatchResult(
          competitorProduct,
          ourProduct,
          comparison
        );
        matches.push(match);
      }
    }

    // Sort by confidence and limit results
    return matches
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, options.maxResults);
  }

  /**
   * Extract search terms from competitor product
   */
  private extractSearchTerms(competitorProduct: CompetitorProduct): string[] {
    const terms: string[] = [];
    
    if (competitorProduct.sku) {
      terms.push(competitorProduct.sku);
      
      // Extract model-like parts from SKU
      const skuParts = this.extractModelParts(competitorProduct.sku);
      terms.push(...skuParts);
    }
    
    if (competitorProduct.model) {
      terms.push(competitorProduct.model);
      
      const modelParts = this.extractModelParts(competitorProduct.model);
      terms.push(...modelParts);
    }

    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Extract model-like parts from a string
   */
  private extractModelParts(input: string): string[] {
    const parts: string[] = [];
    const normalized = input.toUpperCase().trim();

    // Remove common brand prefixes
    const withoutBrand = this.removeBrandPrefixes(normalized);
    if (withoutBrand !== normalized) {
      parts.push(withoutBrand);
    }

    // Extract core model patterns (letters + numbers)
    const modelPatterns = [
      /([A-Z]{2,4}\d{2,6}[A-Z]?)/g,     // TRN036A, XR16024
      /(\d{2,3}[A-Z]{2,6}\d{3,6})/g,    // 16SEER036
      /([A-Z]{3,6}\d{3,8})/g            // LEN036ABC
    ];

    for (const pattern of modelPatterns) {
      const matches = normalized.match(pattern);
      if (matches) {
        parts.push(...matches);
      }
    }

    // Split on common separators
    const separated = normalized.split(/[-_\s]/);
    parts.push(...separated.filter(part => part.length >= 3));

    return [...new Set(parts)];
  }

  /**
   * Remove common HVAC brand prefixes
   */
  private removeBrandPrefixes(model: string): string {
    const prefixes = [
      'TRN', 'TRANE',
      'CAR', 'CARR', 'CARRIER', 
      'LEN', 'LENNOX',
      'YRK', 'YORK',
      'GDM', 'GOODMAN',
      'RHM', 'RHEEM',
      'PAY', 'PAYNE',
      'BRY', 'BRYANT'
    ];

    for (const prefix of prefixes) {
      if (model.startsWith(prefix)) {
        const remainder = model.substring(prefix.length);
        if (remainder.length >= 3) {
          return remainder.replace(/^[-_\s]+/, '');
        }
      }
    }

    return model;
  }

  /**
   * Compare search terms with our product
   */
  private compareModels(searchTerms: string[], ourProduct: OurProduct): ModelComparison {
    const ourTerms = this.extractSearchTerms({
      sku: ourProduct.sku,
      model: ourProduct.model,
      company: ourProduct.brand
    });

    let bestMatch: ModelComparison = {
      ourModel: ourProduct.model,
      theirModel: searchTerms[0] || '',
      similarity: 0,
      method: 'fuzzy',
      confidence: 0
    };

    // Try different matching approaches
    for (const searchTerm of searchTerms) {
      for (const ourTerm of ourTerms) {
        // 1. Prefix matching
        const prefixMatch = this.calculatePrefixMatch(searchTerm, ourTerm);
        if (prefixMatch.confidence !== undefined && prefixMatch.confidence > bestMatch.confidence) {
          bestMatch = {
            ourModel: ourProduct.model,
            theirModel: searchTerm,
            similarity: prefixMatch.similarity || 0,
            method: prefixMatch.method || 'prefix',
            confidence: prefixMatch.confidence
          };
        }

        // 2. Suffix matching
        const suffixMatch = this.calculateSuffixMatch(searchTerm, ourTerm);
        if (suffixMatch.confidence !== undefined && suffixMatch.confidence > bestMatch.confidence) {
          bestMatch = {
            ourModel: ourProduct.model,
            theirModel: searchTerm,
            similarity: suffixMatch.similarity || 0,
            method: suffixMatch.method || 'suffix',
            confidence: suffixMatch.confidence
          };
        }

        // 3. Contains matching
        const containsMatch = this.calculateContainsMatch(searchTerm, ourTerm);
        if (containsMatch.confidence !== undefined && containsMatch.confidence > bestMatch.confidence) {
          bestMatch = {
            ourModel: ourProduct.model,
            theirModel: searchTerm,
            similarity: containsMatch.similarity || 0,
            method: containsMatch.method || 'contains',
            confidence: containsMatch.confidence
          };
        }

        // 4. Fuzzy matching (Levenshtein-based)
        const fuzzyMatch = this.calculateFuzzyMatch(searchTerm, ourTerm);
        if (fuzzyMatch.confidence !== undefined && fuzzyMatch.confidence > bestMatch.confidence) {
          bestMatch = {
            ourModel: ourProduct.model,
            theirModel: searchTerm,
            similarity: fuzzyMatch.similarity || 0,
            method: fuzzyMatch.method || 'fuzzy',
            confidence: fuzzyMatch.confidence
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate prefix match similarity
   */
  private calculatePrefixMatch(search: string, target: string): Partial<ModelComparison> {
    const minLength = Math.min(search.length, target.length);
    const maxLength = Math.max(search.length, target.length);
    
    if (minLength < 3) return { similarity: 0, method: 'prefix', confidence: 0 };

    let matchLength = 0;
    for (let i = 0; i < minLength; i++) {
      if (search[i] === target[i]) {
        matchLength++;
      } else {
        break;
      }
    }

    const similarity = matchLength / maxLength;
    const confidence = matchLength >= 4 ? similarity * 0.85 : similarity * 0.6;

    return { similarity, method: 'prefix', confidence };
  }

  /**
   * Calculate suffix match similarity
   */
  private calculateSuffixMatch(search: string, target: string): Partial<ModelComparison> {
    const minLength = Math.min(search.length, target.length);
    const maxLength = Math.max(search.length, target.length);
    
    if (minLength < 3) return { similarity: 0, method: 'suffix', confidence: 0 };

    let matchLength = 0;
    for (let i = 1; i <= minLength; i++) {
      if (search[search.length - i] === target[target.length - i]) {
        matchLength++;
      } else {
        break;
      }
    }

    const similarity = matchLength / maxLength;
    const confidence = matchLength >= 4 ? similarity * 0.80 : similarity * 0.55;

    return { similarity, method: 'suffix', confidence };
  }

  /**
   * Calculate contains match similarity
   */
  private calculateContainsMatch(search: string, target: string): Partial<ModelComparison> {
    const longer = search.length >= target.length ? search : target;
    const shorter = search.length < target.length ? search : target;

    if (shorter.length < 4) return { similarity: 0, method: 'contains', confidence: 0 };

    if (longer.includes(shorter)) {
      const similarity = shorter.length / longer.length;
      const confidence = similarity * 0.75;
      return { similarity, method: 'contains', confidence };
    }

    return { similarity: 0, method: 'contains', confidence: 0 };
  }

  /**
   * Calculate fuzzy match using Levenshtein distance
   */
  private calculateFuzzyMatch(search: string, target: string): Partial<ModelComparison> {
    const distance = this.levenshteinDistance(search, target);
    const maxLength = Math.max(search.length, target.length);
    
    if (maxLength === 0) return { similarity: 0, method: 'fuzzy', confidence: 0 };

    const similarity = 1 - (distance / maxLength);
    
    // Only consider it a match if similarity is reasonable
    if (similarity < 0.6) return { similarity: 0, method: 'fuzzy', confidence: 0 };

    const confidence = similarity * 0.70; // Fuzzy matches get lower confidence

    return { similarity, method: 'fuzzy', confidence };
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Create match result from comparison
   */
  private createMatchResult(
    competitorProduct: CompetitorProduct,
    ourProduct: OurProduct,
    comparison: ModelComparison
  ): MatchResult {
    const reasoning: string[] = [
      `Model ${comparison.method} match: "${comparison.theirModel}" ~ "${comparison.ourModel}"`,
      `Similarity: ${(comparison.similarity * 100).toFixed(1)}%`
    ];

    return {
      ourSku: ourProduct.sku,
      ourProduct,
      confidence: comparison.confidence,
      matchMethod: 'model_fuzzy',
      reasoning,
      score: {
        exact: 0.0,
        model: comparison.similarity,
        specifications: 0.0,
        overall: comparison.confidence
      }
    };
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return 'model_match';
  }

  /**
   * Get strategy description
   */
  getDescription(): string {
    return 'Finds matches using fuzzy model number comparison with multiple algorithms';
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
    return { min: 0.50, max: 0.85 };
  }
}