/**
 * Specification Matching Strategy
 * Matches HVAC products based on technical specifications like tonnage, SEER, AFUE
 */

import { 
  CompetitorProduct, 
  OurProduct, 
  MatchResult, 
  MatchingOptions,
  SpecificationComparison 
} from '@shared/types/matching.types';

export class SpecificationMatchStrategy {
  
  /**
   * Find matches based on technical specifications
   */
  async findMatches(
    competitorProduct: CompetitorProduct, 
    ourProducts: OurProduct[], 
    options: MatchingOptions
  ): Promise<MatchResult[]> {
    // Extract specifications from competitor product
    const competitorSpecs = this.extractSpecifications(competitorProduct);
    
    if (Object.keys(competitorSpecs).length === 0) {
      return [];
    }

    const matches: MatchResult[] = [];

    for (const ourProduct of ourProducts) {
      const specComparison = this.compareSpecifications(
        competitorSpecs, 
        ourProduct, 
        options
      );
      
      if (specComparison.confidence >= options.confidenceThreshold) {
        const match = this.createMatchResult(
          competitorProduct,
          ourProduct,
          specComparison
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
   * Extract specifications from competitor product
   */
  private extractSpecifications(competitorProduct: CompetitorProduct): Record<string, any> {
    const specs: Record<string, any> = {};
    
    // Use explicit specifications if available
    if (competitorProduct.specifications) {
      return { ...competitorProduct.specifications };
    }

    // Extract from description and other fields
    const text = [
      competitorProduct.sku,
      competitorProduct.model,
      competitorProduct.description
    ]
      .filter(Boolean)
      .join(' ')
      .toUpperCase();

    // Extract tonnage
    const tonnage = this.extractTonnage(text);
    if (tonnage) specs.tonnage = tonnage;

    // Extract SEER ratings
    const seer = this.extractSEER(text);
    if (seer) specs.seer = seer;

    // Extract SEER2 ratings
    const seer2 = this.extractSEER2(text);
    if (seer2) specs.seer2 = seer2;

    // Extract AFUE ratings
    const afue = this.extractAFUE(text);
    if (afue) specs.afue = afue;

    // Extract HSPF ratings
    const hspf = this.extractHSPF(text);
    if (hspf) specs.hspf = hspf;

    // Extract refrigerant type
    const refrigerant = this.extractRefrigerant(text);
    if (refrigerant) specs.refrigerant = refrigerant;

    // Extract stage information
    const stage = this.extractStage(text);
    if (stage) specs.stage = stage;

    return specs;
  }

  /**
   * Extract tonnage from text
   */
  private extractTonnage(text: string): number | null {
    // Common tonnage patterns in HVAC
    const patterns = [
      /(\d+(?:\.\d+)?)\s*TON/g,           // "3.5 TON", "2 TON"
      /(\d{2,3})(?=\D|$)/g,               // "036" (36k BTU = 3 ton), "048" (48k = 4 ton)
      /(\d+(?:\.\d+)?)\s*T(?:\s|$)/g,     // "3.5T", "2T"
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const value = parseFloat(match.replace(/[^\d.]/g, ''));
          if (value >= 12 && value <= 60) {
            // Convert BTU thousands to tons (12k BTU = 1 ton)
            return Math.round((value / 12) * 2) / 2; // Round to nearest 0.5
          } else if (value >= 1 && value <= 5) {
            // Direct tonnage value
            return value;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract SEER rating from text
   */
  private extractSEER(text: string): number | null {
    const patterns = [
      /SEER\s*(\d+(?:\.\d+)?)/g,
      /(\d+(?:\.\d+)?)\s*SEER/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const value = parseFloat(match.replace(/[^\d.]/g, ''));
          if (value >= 13 && value <= 30) {
            return value;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract SEER2 rating from text
   */
  private extractSEER2(text: string): number | null {
    const patterns = [
      /SEER2\s*(\d+(?:\.\d+)?)/g,
      /(\d+(?:\.\d+)?)\s*SEER2/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const value = parseFloat(match.replace(/[^\d.]/g, ''));
          if (value >= 11 && value <= 28) {
            return value;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract AFUE rating from text
   */
  private extractAFUE(text: string): number | null {
    const patterns = [
      /AFUE\s*(\d+(?:\.\d+)?)/g,
      /(\d+(?:\.\d+)?)\s*AFUE/g,
      /(\d{2})%?\s*AFUE/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const value = parseFloat(match.replace(/[^\d.]/g, ''));
          if (value >= 80 && value <= 98) {
            return value;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract HSPF rating from text
   */
  private extractHSPF(text: string): number | null {
    const patterns = [
      /HSPF\s*(\d+(?:\.\d+)?)/g,
      /(\d+(?:\.\d+)?)\s*HSPF/g,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const value = parseFloat(match.replace(/[^\d.]/g, ''));
          if (value >= 7 && value <= 15) {
            return value;
          }
        }
      }
    }

    return null;
  }

  /**
   * Extract refrigerant type from text
   */
  private extractRefrigerant(text: string): string | null {
    const refrigerants = ['R410A', 'R22', 'R32', 'R454B'];
    
    for (const refrigerant of refrigerants) {
      const pattern = new RegExp(refrigerant.replace(/(\d+)/g, '[-\\s]?$1'), 'i');
      if (pattern.test(text)) {
        return refrigerant;
      }
    }

    return null;
  }

  /**
   * Extract stage information from text
   */
  private extractStage(text: string): string | null {
    if (/VARIABLE|VAR|INVERTER/i.test(text)) {
      return 'variable';
    } else if (/TWO[-\s]?STAGE|2[-\s]?STAGE/i.test(text)) {
      return 'two-stage';
    } else if (/SINGLE[-\s]?STAGE|1[-\s]?STAGE/i.test(text)) {
      return 'single';
    }

    return null;
  }

  /**
   * Compare specifications between competitor and our product
   */
  private compareSpecifications(
    competitorSpecs: Record<string, any>,
    ourProduct: OurProduct,
    options: MatchingOptions
  ): { comparisons: SpecificationComparison[]; confidence: number; matchedSpecs: number } {
    const comparisons: SpecificationComparison[] = [];
    let totalWeight = 0;
    let weightedScore = 0;

    // Define specification weights (importance)
    const specWeights: Record<string, number> = {
      tonnage: 1.0,      // Most important for HVAC matching
      seer: 0.8,         // High importance
      seer2: 0.8,        // High importance
      afue: 0.7,         // Important for furnaces
      hspf: 0.6,         // Important for heat pumps
      refrigerant: 0.5,  // Moderate importance
      stage: 0.4         // Lower importance
    };

    // Compare each specification
    for (const [field, theirValue] of Object.entries(competitorSpecs)) {
      const ourValue = (ourProduct as any)[field];
      const weight = specWeights[field] || 0.3; // Default weight for unknown specs
      
      if (ourValue != null) {
        totalWeight += weight;
        
        const comparison = this.compareSpecificationValue(
          field,
          ourValue,
          theirValue,
          options
        );
        
        comparisons.push(comparison);
        weightedScore += comparison.confidence * weight;
      }
    }

    const confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const matchedSpecs = comparisons.filter(c => c.match).length;

    return { comparisons, confidence, matchedSpecs };
  }

  /**
   * Compare individual specification values
   */
  private compareSpecificationValue(
    field: string,
    ourValue: any,
    theirValue: any,
    options: MatchingOptions
  ): SpecificationComparison {
    // Handle numeric specifications with tolerances
    if (typeof ourValue === 'number' && typeof theirValue === 'number') {
      const tolerance = this.getToleranceForField(field, options);
      const difference = Math.abs(ourValue - theirValue);
      const match = difference <= tolerance;
      
      // Calculate confidence based on how close the values are
      const confidence = match ? 
        Math.max(0.5, 1 - (difference / tolerance)) : 
        Math.max(0, 0.5 - (difference / tolerance));

      return {
        field,
        ourValue,
        theirValue,
        match,
        tolerance,
        confidence
      };
    }

    // Handle string specifications (exact match)
    if (typeof ourValue === 'string' && typeof theirValue === 'string') {
      const match = ourValue.toLowerCase() === theirValue.toLowerCase();
      return {
        field,
        ourValue,
        theirValue,
        match,
        confidence: match ? 1.0 : 0.0
      };
    }

    // Default: no match for mixed types
    return {
      field,
      ourValue,
      theirValue,
      match: false,
      confidence: 0.0
    };
  }

  /**
   * Get tolerance for a specific field
   */
  private getToleranceForField(field: string, options: MatchingOptions): number {
    switch (field) {
      case 'tonnage':
        return options.specifications.tonnageTolerance;
      case 'seer':
      case 'seer2':
        return options.specifications.seerTolerance;
      case 'afue':
        return options.specifications.afueTolerance;
      case 'hspf':
        return options.specifications.hspfTolerance;
      default:
        return 0.1; // 10% tolerance for unknown numeric fields
    }
  }

  /**
   * Create match result from specification comparison
   */
  private createMatchResult(
    competitorProduct: CompetitorProduct,
    ourProduct: OurProduct,
    specComparison: { comparisons: SpecificationComparison[]; confidence: number; matchedSpecs: number }
  ): MatchResult {
    const reasoning: string[] = [];
    const matched: string[] = [];
    const mismatched: string[] = [];
    
    for (const comp of specComparison.comparisons) {
      if (comp.match) {
        matched.push(`${comp.field}: ${comp.theirValue} ≈ ${comp.ourValue}`);
        reasoning.push(`✓ ${comp.field}: ${comp.theirValue} matches ${comp.ourValue}`);
      } else {
        mismatched.push(`${comp.field}: ${comp.theirValue} ≠ ${comp.ourValue}`);
        reasoning.push(`✗ ${comp.field}: ${comp.theirValue} vs ${comp.ourValue}`);
      }
    }

    reasoning.unshift(`Specification match: ${matched.length}/${specComparison.comparisons.length} specs matched`);

    return {
      ourSku: ourProduct.sku,
      ourProduct,
      confidence: specComparison.confidence,
      matchMethod: 'specifications',
      reasoning,
      specifications: {
        matched,
        mismatched,
        missing: [] // Could be enhanced to track missing specs
      },
      score: {
        exact: 0.0,
        model: 0.0,
        specifications: specComparison.confidence,
        overall: specComparison.confidence
      }
    };
  }

  /**
   * Get strategy name
   */
  getName(): string {
    return 'specification_match';
  }

  /**
   * Get strategy description
   */
  getDescription(): string {
    return 'Matches products based on technical specifications like tonnage, SEER, AFUE';
  }

  /**
   * Check if strategy can handle the given product
   */
  canHandle(competitorProduct: CompetitorProduct): boolean {
    const specs = this.extractSpecifications(competitorProduct);
    return Object.keys(specs).length > 0;
  }

  /**
   * Get expected confidence range for this strategy
   */
  getConfidenceRange(): { min: number; max: number } {
    return { min: 0.60, max: 0.95 };
  }
}