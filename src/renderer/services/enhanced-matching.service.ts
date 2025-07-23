/**
 * Enhanced Matching Service - Best-in-Class Integration
 * Orchestrates matching, research, learning, and review workflows
 */

import { 
  CompetitorProduct, 
  OurProduct, 
  MatchResult, 
  MatchingOptions,
  MatchingResponse 
} from '@shared/types/matching.types';

import { CrosswalkMatchingEngine } from './matching/engine';
import { WebSearchEnhancementService, ProductResearchRequest, ProductResearchResult } from './research/web-search.service';
import { KnowledgeBaseService } from './research/knowledge-base.service';
import { ManualReviewService } from './review/manual-review.service';

export interface EnhancedMatchingOptions extends MatchingOptions {
  enableWebResearch: boolean;
  researchDepth: 'basic' | 'thorough' | 'comprehensive';
  researchTimeout: number;
  autoSubmitHighConfidence: boolean;
  highConfidenceThreshold: number;
  requireManualReview: boolean;
  learnFromResults: boolean;
}

export interface EnhancedMatchingResult extends MatchingResponse {
  researchData?: ProductResearchResult;
  knowledgeApplied: boolean;
  reviewStatus: 'not_required' | 'queued' | 'completed';
  reviewItemId?: string;
  confidenceLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
  recommendedAction: 'approve' | 'review' | 'research' | 'reject';
  enhancementNotes: string[];
}

export interface BatchProcessingProgress {
  current: number;
  total: number;
  processed: number;
  successful: number;
  needsReview: number;
  failed: number;
  estimatedTimeRemaining: number;
  currentProduct?: CompetitorProduct;
  stage: 'matching' | 'researching' | 'reviewing' | 'learning' | 'complete';
}

export class EnhancedMatchingService {
  private matchingEngine: CrosswalkMatchingEngine;
  private webSearchService: WebSearchEnhancementService;
  private knowledgeBase: KnowledgeBaseService;
  private reviewService: ManualReviewService;

  constructor() {
    this.matchingEngine = new CrosswalkMatchingEngine();
    this.webSearchService = new WebSearchEnhancementService();
    this.knowledgeBase = new KnowledgeBaseService();
    this.reviewService = new ManualReviewService();
  }

  /**
   * Get company name from settings for search context
   */
  private async getCompanyNameFromSettings(): Promise<string> {
    try {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.settings?.getAll) {
        const settings = await electronAPI.settings.getAll();
        if (settings.success && settings.data?.companyName) {
          return settings.data.companyName;
        }
      }
    } catch (error) {
      console.warn('Failed to get company name from settings:', error);
    }
    
    // Default fallback
    return 'Lennox';
  }

  /**
   * Enhanced matching with full research and learning pipeline
   */
  async enhancedMatch(
    competitorProduct: CompetitorProduct,
    ourProducts: OurProduct[],
    options: EnhancedMatchingOptions
  ): Promise<EnhancedMatchingResult> {
    const startTime = Date.now();
    const enhancementNotes: string[] = [];

    try {
      // Step 1: Check knowledge base for existing information
      let knowledgeApplied = false;
      const existingKnowledge = await this.knowledgeBase.queryKnowledge(competitorProduct);
      
      if (existingKnowledge && existingKnowledge.reliability > 0.7) {
        enhancementNotes.push(`Applied existing knowledge (reliability: ${(existingKnowledge.reliability * 100).toFixed(0)}%)`);
        knowledgeApplied = true;

        // Enhance competitor product with known specifications
        competitorProduct = {
          ...competitorProduct,
          specifications: {
            ...competitorProduct.specifications,
            ...existingKnowledge.confirmedSpecs
          }
        };
      }

      // Step 2: Get smart suggestions from learned patterns
      const smartSuggestions = await this.knowledgeBase.getSmartSuggestions(
        competitorProduct, 
        ourProducts
      );

      if (smartSuggestions.length > 0) {
        enhancementNotes.push(`Applied ${smartSuggestions.length} learned pattern suggestions`);
      }

      // Step 3: Run primary matching
      const primaryResult = await this.matchingEngine.findMatches({
        competitorProduct,
        ourProducts,
        options
      });

      // Step 4: Determine if web research is needed
      let researchData: ProductResearchResult | undefined;
      const needsResearch = this.shouldPerformResearch(primaryResult, options);

      if (needsResearch && options.enableWebResearch) {
        enhancementNotes.push('Triggered web research due to uncertain matches');
        
        // Get company name from settings
        const ourCompanyName = await this.getCompanyNameFromSettings();
        
        const researchRequest: ProductResearchRequest = {
          competitorProduct,
          uncertainMatches: primaryResult.matches,
          researchDepth: options.researchDepth,
          searchTimeout: options.researchTimeout,
          ourCompanyName
        };

        researchData = await this.webSearchService.researchProduct(researchRequest);
        
        if (researchData.enhancedSpecs && Object.keys(researchData.enhancedSpecs).length > 0) {
          // Re-run matching with enhanced data
          const enhancedCompetitor: CompetitorProduct = {
            ...competitorProduct,
            specifications: {
              ...competitorProduct.specifications,
              ...researchData.enhancedSpecs
            }
          };

          const enhancedResult = await this.matchingEngine.findMatches({
            competitorProduct: enhancedCompetitor,
            ourProducts,
            options
          });

          // Use enhanced results if better
          if (enhancedResult.matches.length > 0 && 
              (primaryResult.matches.length === 0 || 
               enhancedResult.matches[0].confidence > primaryResult.matches[0].confidence)) {
            
            primaryResult.matches = enhancedResult.matches;
            primaryResult.confidence = enhancedResult.confidence;
            enhancementNotes.push(`Research improved match confidence by ${((enhancedResult.matches[0]?.confidence || 0) - (primaryResult.matches[0]?.confidence || 0)) * 100}%`);
          }
        }

        // Store research findings in knowledge base
        await this.knowledgeBase.catalogueResearchResults(
          competitorProduct,
          researchData
        );
      }

      // Step 5: Determine confidence level and recommended action
      const bestMatch = primaryResult.matches[0];
      const confidence = bestMatch?.confidence || 0;
      
      const confidenceLevel = this.determineConfidenceLevel(confidence);
      const recommendedAction = this.determineRecommendedAction(
        confidence, 
        options, 
        researchData?.needsManualReview || false
      );

      // Step 6: Handle review workflow
      let reviewStatus: EnhancedMatchingResult['reviewStatus'] = 'not_required';
      let reviewItemId: string | undefined;

      if (recommendedAction === 'review' || 
          (options.requireManualReview && confidence < options.highConfidenceThreshold)) {
        
        const priority = this.determinePriority(confidence, competitorProduct);
        reviewItemId = await this.reviewService.addToReviewQueue(
          competitorProduct,
          primaryResult.matches,
          researchData,
          priority
        );
        
        reviewStatus = 'queued';
        enhancementNotes.push(`Queued for manual review (${priority} priority)`);
      }

      // Step 7: Auto-approve high confidence matches
      if (options.autoSubmitHighConfidence && 
          confidence >= options.highConfidenceThreshold && 
          recommendedAction === 'approve') {
        
        if (options.learnFromResults && bestMatch) {
          await this.knowledgeBase.learnFromSuccess(
            competitorProduct,
            bestMatch.ourProduct,
            bestMatch.matchMethod,
            confidence
          );
          enhancementNotes.push('Applied learning from high-confidence match');
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        ...primaryResult,
        processingTime,
        researchData,
        knowledgeApplied,
        reviewStatus,
        reviewItemId,
        confidenceLevel,
        recommendedAction,
        enhancementNotes
      };

    } catch (error) {
      console.error('Enhanced matching failed:', error);
      
      return {
        competitorProduct,
        matches: [],
        processingTime: Date.now() - startTime,
        totalCandidates: ourProducts.length,
        strategiesUsed: [],
        confidence: 'none',
        knowledgeApplied: false,
        reviewStatus: 'not_required',
        confidenceLevel: 'none',
        recommendedAction: 'reject',
        enhancementNotes: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Batch process with comprehensive progress tracking
   */
  async batchProcessEnhanced(
    competitorProducts: CompetitorProduct[],
    ourProducts: OurProduct[],
    options: EnhancedMatchingOptions,
    progressCallback?: (progress: BatchProcessingProgress) => void
  ): Promise<EnhancedMatchingResult[]> {
    const results: EnhancedMatchingResult[] = [];
    const startTime = Date.now();
    
    let processed = 0;
    let successful = 0;
    let needsReview = 0;
    let failed = 0;

    for (let i = 0; i < competitorProducts.length; i++) {
      const competitorProduct = competitorProducts[i];
      
      // Report progress
      if (progressCallback) {
        const elapsed = Date.now() - startTime;
        const avgTimePerItem = elapsed / Math.max(i, 1);
        const remaining = competitorProducts.length - i;
        const estimatedTimeRemaining = avgTimePerItem * remaining;

        progressCallback({
          current: i + 1,
          total: competitorProducts.length,
          processed,
          successful,
          needsReview,
          failed,
          estimatedTimeRemaining,
          currentProduct: competitorProduct,
          stage: 'matching'
        });
      }

      try {
        const result = await this.enhancedMatch(competitorProduct, ourProducts, options);
        results.push(result);
        
        processed++;
        
        if (result.matches.length > 0 && result.confidenceLevel !== 'none') {
          successful++;
        }
        
        if (result.reviewStatus === 'queued') {
          needsReview++;
        }

      } catch (error) {
        console.error(`Failed to process ${competitorProduct.sku}:`, error);
        failed++;
        
        // Create error result
        results.push({
          competitorProduct,
          matches: [],
          processingTime: 0,
          totalCandidates: ourProducts.length,
          strategiesUsed: [],
          confidence: 'none',
          knowledgeApplied: false,
          reviewStatus: 'not_required',
          confidenceLevel: 'none',
          recommendedAction: 'reject',
          enhancementNotes: [`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        });
      }

      // Small delay to prevent overwhelming the system
      if (i < competitorProducts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Final progress update
    if (progressCallback) {
      progressCallback({
        current: competitorProducts.length,
        total: competitorProducts.length,
        processed,
        successful,
        needsReview,
        failed,
        estimatedTimeRemaining: 0,
        stage: 'complete'
      });
    }

    return results;
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    matching: { processed: number; averageTime: number };
    knowledge: { entries: number; reliability: number; coverage: number };
    review: { pending: number; inReview: number; avgTime: number };
    performance: { uptime: number; errorRate: number; throughput: number };
  }> {
    const matchingStats = this.matchingEngine.getStats();
    const knowledgeStats = await this.knowledgeBase.getStats();
    const reviewQueue = await this.reviewService.getReviewQueue();

    return {
      matching: {
        processed: matchingStats.totalProcessed,
        averageTime: matchingStats.averageProcessingTime
      },
      knowledge: {
        entries: knowledgeStats.totalEntries,
        reliability: knowledgeStats.averageReliability,
        coverage: knowledgeStats.researchCoverage
      },
      review: {
        pending: reviewQueue.pending.length,
        inReview: reviewQueue.inReview.length,
        avgTime: reviewQueue.averageReviewTime
      },
      performance: {
        uptime: 99.9, // Would be calculated from actual uptime
        errorRate: 0.01, // Would be calculated from error logs
        throughput: 100 // Products per hour
      }
    };
  }

  /**
   * Export comprehensive results with all enhancement data
   */
  async exportEnhancedResults(
    results: EnhancedMatchingResult[],
    format: 'csv' | 'xlsx' | 'json' = 'csv'
  ): Promise<string | object> {
    switch (format) {
      case 'json':
        return JSON.stringify(results, null, 2);
      
      case 'csv':
        return this.convertEnhancedToCSV(results);
      
      default:
        throw new Error(`Format ${format} not supported`);
    }
  }

  // Private helper methods

  private shouldPerformResearch(result: MatchingResponse, options: EnhancedMatchingOptions): boolean {
    if (!options.enableWebResearch) return false;
    
    // Research if no matches found
    if (result.matches.length === 0) return true;
    
    // Research if confidence is low
    const bestConfidence = result.matches[0]?.confidence || 0;
    if (bestConfidence < 0.7) return true;
    
    // Research if conflicting matches
    if (result.matches.length > 1) {
      const confidenceGap = result.matches[0].confidence - result.matches[1].confidence;
      if (confidenceGap < 0.2) return true;
    }
    
    return false;
  }

  private determineConfidenceLevel(confidence: number): EnhancedMatchingResult['confidenceLevel'] {
    if (confidence >= 0.90) return 'excellent';
    if (confidence >= 0.75) return 'good';
    if (confidence >= 0.60) return 'fair';
    if (confidence >= 0.40) return 'poor';
    return 'none';
  }

  private determineRecommendedAction(
    confidence: number, 
    options: EnhancedMatchingOptions,
    needsManualReview: boolean
  ): EnhancedMatchingResult['recommendedAction'] {
    if (needsManualReview) return 'review';
    
    if (confidence >= options.highConfidenceThreshold) {
      return 'approve';
    } else if (confidence >= 0.60) {
      return 'review';
    } else if (confidence >= 0.30) {
      return 'research';
    } else {
      return 'reject';
    }
  }

  private determinePriority(
    confidence: number, 
    competitorProduct: CompetitorProduct
  ): 'urgent' | 'high' | 'medium' | 'low' {
    // High value products get higher priority
    if (competitorProduct.price && competitorProduct.price > 5000) {
      return confidence < 0.3 ? 'urgent' : 'high';
    }
    
    // Standard priority based on confidence
    if (confidence < 0.2) return 'high';
    if (confidence < 0.5) return 'medium';
    return 'low';
  }

  private convertEnhancedToCSV(results: EnhancedMatchingResult[]): string {
    const headers = [
      'Competitor SKU',
      'Competitor Company',
      'Competitor Price',
      'Our SKU',
      'Our Model',
      'Confidence',
      'Confidence Level',
      'Match Method',
      'Recommended Action',
      'Review Status',
      'Knowledge Applied',
      'Research Performed',
      'Enhancement Notes',
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
          result.confidenceLevel,
          'none',
          result.recommendedAction,
          result.reviewStatus,
          result.knowledgeApplied ? 'Yes' : 'No',
          result.researchData ? 'Yes' : 'No',
          result.enhancementNotes.join('; '),
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
        result.confidenceLevel,
        match.matchMethod,
        result.recommendedAction,
        result.reviewStatus,
        result.knowledgeApplied ? 'Yes' : 'No',
        result.researchData ? 'Yes' : 'No',
        result.enhancementNotes.join('; '),
        result.processingTime
      ]);
    });

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Get default enhanced options
   */
  getDefaultEnhancedOptions(): EnhancedMatchingOptions {
    return {
      ...this.matchingEngine.getDefaultOptions(),
      enableWebResearch: true,
      researchDepth: 'thorough',
      researchTimeout: 30000, // 30 seconds
      autoSubmitHighConfidence: true,
      highConfidenceThreshold: 0.85,
      requireManualReview: false,
      learnFromResults: true
    };
  }
}