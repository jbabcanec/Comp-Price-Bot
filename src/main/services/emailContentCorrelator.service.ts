import { ExtractedData } from '@shared/types/product.types';
import { CorrelatedEmailData } from './emailComponentRouter.service';

export interface CorrelationRule {
  name: string;
  weight: number;
  matcher: (primary: ExtractedData, supporting: ExtractedData) => boolean;
  confidenceBoost: number;
}

export interface CorrelationAnalysis {
  correlatedItems: CorrelatedEmailData[];
  orphanedItems: CorrelatedEmailData[];
  correlationStats: {
    totalPrimaryItems: number;
    itemsWithSupport: number;
    itemsWithMultipleSupport: number;
    averageConfidenceBoost: number;
    correlationRuleUsage: Record<string, number>;
  };
}

export class EmailContentCorrelator {
  private correlationRules: CorrelationRule[];

  constructor() {
    this.correlationRules = this.initializeCorrelationRules();
  }

  /**
   * Main entry point - correlate data from different email sources
   */
  async correlateEmailContent(
    textResults: ExtractedData[],
    imageResults: ExtractedData[],
    attachmentResults: ExtractedData[]
  ): Promise<CorrelationAnalysis> {
    
    // Create correlation analysis
    const correlatedItems: CorrelatedEmailData[] = [];
    const orphanedItems: CorrelatedEmailData[] = [];
    const correlationStats = {
      totalPrimaryItems: 0,
      itemsWithSupport: 0,
      itemsWithMultipleSupport: 0,
      averageConfidenceBoost: 0,
      correlationRuleUsage: {} as Record<string, number>
    };

    // Initialize rule usage tracking
    for (const rule of this.correlationRules) {
      correlationStats.correlationRuleUsage[rule.name] = 0;
    }

    // Process text results as primary sources
    const processedSkus = new Set<string>();
    
    for (const textProduct of textResults) {
      if (!textProduct.sku || processedSkus.has(textProduct.sku)) continue;
      processedSkus.add(textProduct.sku);

      const correlation = await this.createCorrelation(
        textProduct,
        imageResults,
        attachmentResults,
        correlationStats
      );

      correlatedItems.push(correlation);
      correlationStats.totalPrimaryItems++;
      
      if (correlation.supportingEvidence.length > 0) {
        correlationStats.itemsWithSupport++;
        if (correlation.supportingEvidence.length > 1) {
          correlationStats.itemsWithMultipleSupport++;
        }
      }
    }

    // Handle orphaned data (products only found in images or attachments)
    const orphaned = this.findOrphanedData(
      imageResults,
      attachmentResults,
      textResults,
      correlationStats
    );
    orphanedItems.push(...orphaned);

    // Calculate average confidence boost
    const totalBoost = correlatedItems.reduce((sum, item) => {
      const originalConfidence = item.primarySource.confidence || 0.5;
      return sum + Math.max(0, item.confidence - originalConfidence);
    }, 0);
    
    correlationStats.averageConfidenceBoost = correlatedItems.length > 0 ? 
      totalBoost / correlatedItems.length : 0;

    return {
      correlatedItems,
      orphanedItems,
      correlationStats
    };
  }

  /**
   * Create correlation for a primary text result
   */
  private async createCorrelation(
    primarySource: ExtractedData,
    imageResults: ExtractedData[],
    attachmentResults: ExtractedData[],
    stats: CorrelationAnalysis['correlationStats']
  ): Promise<CorrelatedEmailData> {
    
    const correlation: CorrelatedEmailData = {
      primarySource,
      supportingEvidence: [],
      confidence: primarySource.confidence || 0.5,
      sources: ['text'],
      correlationNotes: ''
    };

    const notes: string[] = [];
    const allSupportingData = [...imageResults, ...attachmentResults];

    // Apply correlation rules to find supporting evidence
    for (const supportingItem of allSupportingData) {
      for (const rule of this.correlationRules) {
        if (rule.matcher(primarySource, supportingItem)) {
          // Found a match using this rule
          correlation.supportingEvidence.push(supportingItem);
          correlation.confidence = Math.min(1.0, correlation.confidence + rule.confidenceBoost);
          
          // Track rule usage
          stats.correlationRuleUsage[rule.name]++;
          
          // Add source type
          const sourceType = this.getSourceType(supportingItem);
          if (!correlation.sources.includes(sourceType)) {
            correlation.sources.push(sourceType);
          }
          
          notes.push(`${rule.name} match with ${supportingItem.source || 'unknown source'}`);
          break; // Only apply one rule per supporting item
        }
      }
    }

    // Add pricing correlation analysis
    if (correlation.supportingEvidence.length > 0) {
      const pricingAnalysis = this.analyzePricingConsistency(primarySource, correlation.supportingEvidence);
      if (pricingAnalysis) {
        notes.push(pricingAnalysis);
      }
    }

    correlation.correlationNotes = notes.join('; ');
    
    return correlation;
  }

  /**
   * Initialize correlation rules for matching products across sources
   */
  private initializeCorrelationRules(): CorrelationRule[] {
    return [
      {
        name: 'Exact SKU Match',
        weight: 1.0,
        confidenceBoost: 0.3,
        matcher: (primary, supporting) => {
          return this.normalizedMatch(primary.sku, supporting.sku);
        }
      },
      {
        name: 'Model Number Match',
        weight: 0.8,
        confidenceBoost: 0.25,
        matcher: (primary, supporting) => {
          if (!primary.model || !supporting.model) return false;
          return this.normalizedMatch(primary.model, supporting.model);
        }
      },
      {
        name: 'Brand + Model Match',
        weight: 0.7,
        confidenceBoost: 0.2,
        matcher: (primary, supporting) => {
          if (!primary.company || !supporting.company || !primary.model || !supporting.model) return false;
          return this.normalizedMatch(primary.company, supporting.company) &&
                 this.normalizedMatch(primary.model, supporting.model);
        }
      },
      {
        name: 'Specification Match',
        weight: 0.6,
        confidenceBoost: 0.15,
        matcher: (primary, supporting) => {
          return this.specificationMatch(primary, supporting);
        }
      },
      {
        name: 'Fuzzy SKU Match',
        weight: 0.5,
        confidenceBoost: 0.1,
        matcher: (primary, supporting) => {
          if (!primary.sku || !supporting.sku) return false;
          return this.fuzzyMatch(primary.sku, supporting.sku) > 0.8;
        }
      },
      {
        name: 'Price + Company Match',
        weight: 0.4,
        confidenceBoost: 0.1,
        matcher: (primary, supporting) => {
          if (!primary.price || !supporting.price || !primary.company || !supporting.company) return false;
          
          const priceMatch = Math.abs(primary.price - supporting.price) < (primary.price * 0.05); // 5% tolerance
          const companyMatch = this.normalizedMatch(primary.company, supporting.company);
          
          return priceMatch && companyMatch;
        }
      }
    ];
  }

  /**
   * Find orphaned data that doesn't correlate with text sources
   */
  private findOrphanedData(
    imageResults: ExtractedData[],
    attachmentResults: ExtractedData[],
    textResults: ExtractedData[],
    stats: CorrelationAnalysis['correlationStats']
  ): CorrelatedEmailData[] {
    
    const orphaned: CorrelatedEmailData[] = [];
    const textSkus = new Set(textResults.map(t => this.normalizeSku(t.sku)).filter(Boolean));
    const processedOrphans = new Set<string>();

    // Check image results
    for (const imageResult of imageResults) {
      const normalizedSku = this.normalizeSku(imageResult.sku);
      if (normalizedSku && !textSkus.has(normalizedSku) && !processedOrphans.has(normalizedSku)) {
        processedOrphans.add(normalizedSku);
        
        orphaned.push({
          primarySource: imageResult,
          supportingEvidence: [],
          confidence: Math.max(0.2, (imageResult.confidence || 0.5) - 0.3), // Lower confidence for orphaned
          sources: ['image'],
          correlationNotes: 'Found only in image content - no text confirmation'
        });
      }
    }

    // Check attachment results
    for (const attachmentResult of attachmentResults) {
      const normalizedSku = this.normalizeSku(attachmentResult.sku);
      if (normalizedSku && !textSkus.has(normalizedSku) && !processedOrphans.has(normalizedSku)) {
        processedOrphans.add(normalizedSku);
        
        orphaned.push({
          primarySource: attachmentResult,
          supportingEvidence: [],
          confidence: Math.max(0.3, (attachmentResult.confidence || 0.5) - 0.2), // Slightly better than image-only
          sources: ['attachment'],
          correlationNotes: 'Found only in attachment - no text confirmation'
        });
      }
    }

    return orphaned;
  }

  /**
   * Analyze pricing consistency across correlated sources
   */
  private analyzePricingConsistency(primary: ExtractedData, supporting: ExtractedData[]): string | null {
    if (!primary.price) return null;
    
    const supportingPrices = supporting
      .map(s => s.price)
      .filter((price): price is number => typeof price === 'number');
    
    if (supportingPrices.length === 0) return null;
    
    const priceVariations = supportingPrices.map(price => {
      const primaryPrice = primary.price || 0;
      const difference = Math.abs(price - primaryPrice);
      const percentDiff = primaryPrice > 0 ? (difference / primaryPrice) * 100 : 0;
      return { price, difference, percentDiff };
    });
    
    const maxVariation = Math.max(...priceVariations.map(v => v.percentDiff));
    
    if (maxVariation < 1) {
      return 'Excellent price consistency (<1% variation)';
    } else if (maxVariation < 5) {
      return `Good price consistency (<5% variation, max: ${maxVariation.toFixed(1)}%)`;
    } else if (maxVariation < 10) {
      return `Moderate price variation (max: ${maxVariation.toFixed(1)}%)`;
    } else {
      return `High price variation (max: ${maxVariation.toFixed(1)}%) - manual review recommended`;
    }
  }

  /**
   * Check if specifications match between two products
   */
  private specificationMatch(primary: ExtractedData, supporting: ExtractedData): boolean {
    const specs = ['tonnage', 'seer', 'seer2', 'afue', 'hspf'];
    let matchCount = 0;
    let totalComparisons = 0;
    
    for (const spec of specs) {
      const primaryValue = (primary as any)[spec];
      const supportingValue = (supporting as any)[spec];
      
      if (primaryValue != null && supportingValue != null) {
        totalComparisons++;
        
        // Define tolerance for each specification type
        const tolerance = this.getSpecTolerance(spec);
        const difference = Math.abs(Number(primaryValue) - Number(supportingValue));
        
        if (difference <= tolerance) {
          matchCount++;
        }
      }
    }
    
    // Need at least 2 spec comparisons and 80% match rate
    return totalComparisons >= 2 && (matchCount / totalComparisons) >= 0.8;
  }

  /**
   * Get tolerance for specification matching
   */
  private getSpecTolerance(spec: string): number {
    const tolerances: Record<string, number> = {
      'tonnage': 0.1,  // 0.1 ton tolerance
      'seer': 1.0,     // 1 SEER point tolerance
      'seer2': 1.0,    // 1 SEER2 point tolerance
      'afue': 2.0,     // 2% AFUE tolerance
      'hspf': 0.5      // 0.5 HSPF tolerance
    };
    
    return tolerances[spec] || 0;
  }

  /**
   * Normalize string for exact matching
   */
  private normalizedMatch(str1?: string, str2?: string): boolean {
    if (!str1 || !str2) return false;
    return this.normalizeString(str1) === this.normalizeString(str2);
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str.replace(/[-\s_.]/g, '').toUpperCase();
  }

  /**
   * Normalize SKU for comparison
   */
  private normalizeSku(sku?: string): string {
    if (!sku) return '';
    return this.normalizeString(sku);
  }

  /**
   * Calculate fuzzy match score between two strings
   */
  private fuzzyMatch(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const normalized1 = this.normalizeString(str1);
    const normalized2 = this.normalizeString(str2);
    
    if (normalized1 === normalized2) return 1;
    
    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(normalized1, normalized2);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    
    return maxLength > 0 ? 1 - (distance / maxLength) : 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Get source type from extracted data
   */
  private getSourceType(data: ExtractedData): string {
    if (!data.source) return 'unknown';
    
    const source = data.source.toLowerCase();
    if (source.includes('image') || source.includes('ocr')) return 'image';
    if (source.includes('attachment')) return 'attachment';
    if (source.includes('text') || source.includes('html')) return 'text';
    
    return 'unknown';
  }

  /**
   * Get correlation summary for reporting
   */
  getCorrelationSummary(analysis: CorrelationAnalysis): string {
    const { correlationStats } = analysis;
    const supportRate = correlationStats.totalPrimaryItems > 0 ? 
      (correlationStats.itemsWithSupport / correlationStats.totalPrimaryItems * 100).toFixed(1) : '0';
    
    const multiSupportRate = correlationStats.totalPrimaryItems > 0 ?
      (correlationStats.itemsWithMultipleSupport / correlationStats.totalPrimaryItems * 100).toFixed(1) : '0';

    return [
      `Processed ${correlationStats.totalPrimaryItems} primary items`,
      `${correlationStats.itemsWithSupport} items with support (${supportRate}%)`,
      `${correlationStats.itemsWithMultipleSupport} items with multiple sources (${multiSupportRate}%)`,
      `Average confidence boost: +${(correlationStats.averageConfidenceBoost * 100).toFixed(1)}%`,
      `Orphaned items: ${analysis.orphanedItems.length}`
    ].join(' | ');
  }

  /**
   * Get detailed correlation report
   */
  getDetailedCorrelationReport(analysis: CorrelationAnalysis): string {
    const report = [
      '=== Email Content Correlation Report ===',
      `Total Primary Items: ${analysis.correlationStats.totalPrimaryItems}`,
      `Items with Supporting Evidence: ${analysis.correlationStats.itemsWithSupport}`,
      `Items with Multiple Sources: ${analysis.correlationStats.itemsWithMultipleSupport}`,
      `Orphaned Items: ${analysis.orphanedItems.length}`,
      `Average Confidence Boost: +${(analysis.correlationStats.averageConfidenceBoost * 100).toFixed(1)}%`,
      '',
      '=== Correlation Rule Usage ===',
    ];

    for (const [ruleName, usage] of Object.entries(analysis.correlationStats.correlationRuleUsage)) {
      report.push(`${ruleName}: ${usage} applications`);
    }

    report.push('');
    report.push('=== High Confidence Correlations ===');

    const highConfidence = analysis.correlatedItems
      .filter(item => item.confidence > 0.8)
      .sort((a, b) => b.confidence - a.confidence);

    for (const item of highConfidence.slice(0, 10)) { // Top 10
      report.push(`${item.primarySource.sku} (${item.primarySource.company}) - Confidence: ${(item.confidence * 100).toFixed(1)}% - Sources: ${item.sources.join(', ')}`);
      if (item.correlationNotes) {
        report.push(`  Notes: ${item.correlationNotes}`);
      }
    }

    if (analysis.orphanedItems.length > 0) {
      report.push('');
      report.push('=== Orphaned Items (Review Recommended) ===');
      
      for (const orphan of analysis.orphanedItems.slice(0, 5)) { // Top 5 orphans
        report.push(`${orphan.primarySource.sku} (${orphan.primarySource.company}) - Source: ${orphan.sources[0]} - ${orphan.correlationNotes}`);
      }
    }

    return report.join('\n');
  }
}