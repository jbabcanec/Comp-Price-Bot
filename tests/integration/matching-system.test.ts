/**
 * Integration Tests for Phase 3 Matching System
 * Tests the complete workflow: Matching -> Research -> Learning -> Review
 */

import { 
  CrosswalkMatchingEngine, 
  MatchingStrategy 
} from '../../src/renderer/services/matching/engine';
import { ExactMatchStrategy } from '../../src/renderer/services/matching/strategies/exact.strategy';
import { ModelMatchStrategy } from '../../src/renderer/services/matching/strategies/model.strategy';
import { SpecificationMatchStrategy } from '../../src/renderer/services/matching/strategies/specs.strategy';
import { ConfidenceScorer } from '../../src/renderer/services/matching/confidence.scorer';
import { WebSearchEnhancementService } from '../../src/renderer/services/research/web-search.service';
import { KnowledgeBaseService } from '../../src/renderer/services/research/knowledge-base.service';
import { ManualReviewService } from '../../src/renderer/services/review/manual-review.service';
import { EnhancedMatchingService } from '../../src/renderer/services/enhanced-matching.service';

import { 
  CompetitorProduct, 
  OurProduct, 
  MatchingOptions,
  EnhancedMatchingOptions 
} from '../../src/shared/types/matching.types';

describe('Phase 3 Matching System Integration', () => {
  let matchingEngine: CrosswalkMatchingEngine;
  let webSearchService: WebSearchEnhancementService;
  let knowledgeBaseService: KnowledgeBaseService;
  let reviewService: ManualReviewService;
  let enhancedMatchingService: EnhancedMatchingService;
  
  let testCompetitorProducts: CompetitorProduct[];
  let testOurProducts: OurProduct[];
  let defaultOptions: EnhancedMatchingOptions;

  beforeEach(() => {
    // Initialize services
    matchingEngine = new CrosswalkMatchingEngine();
    webSearchService = new WebSearchEnhancementService();
    knowledgeBaseService = new KnowledgeBaseService();
    reviewService = new ManualReviewService();
    enhancedMatchingService = new EnhancedMatchingService();

    // Test data setup
    testCompetitorProducts = [
      {
        sku: 'TRN-036-14',
        company: 'Trane',
        price: 2450,
        model: 'XR14036',
        description: '3 Ton 14 SEER Air Conditioner',
        specifications: {
          tonnage: 3.0,
          seer: 14,
          refrigerant: 'R410A',
          type: 'air_conditioner'
        }
      },
      {
        sku: 'CAR-048-16',
        company: 'Carrier',
        price: 3200,
        model: '24ACC648',
        description: '4 Ton 16 SEER Air Conditioner',
        specifications: {
          tonnage: 4.0,
          seer: 16,
          refrigerant: 'R410A',
          type: 'air_conditioner'
        }
      },
      {
        sku: 'UNKNOWN-SKU',
        company: 'Unknown Brand',
        price: 1500,
        description: 'Mystery HVAC Unit'
      },
      {
        sku: 'GDM-060-18',
        company: 'Goodman',
        price: 2800,
        model: 'GSX160601',
        description: '5 Ton 16 SEER Heat Pump',
        specifications: {
          tonnage: 5.0,
          seer: 16,
          refrigerant: 'R410A',
          type: 'heat_pump'
        }
      }
    ];

    testOurProducts = [
      {
        id: 1,
        sku: 'LEN-036-16',
        model: 'EL16XC1036',
        brand: 'Lennox',
        type: 'air_conditioner',
        tonnage: 3.0,
        seer: 16,
        refrigerant: 'R410A',
        created_at: '2024-01-01'
      },
      {
        id: 2,
        sku: 'LEN-048-18',
        model: 'EL18XC1048',
        brand: 'Lennox',
        type: 'air_conditioner',
        tonnage: 4.0,
        seer: 18,
        refrigerant: 'R410A',
        created_at: '2024-01-01'
      },
      {
        id: 3,
        sku: 'LEN-060-16',
        model: 'HP26-060',
        brand: 'Lennox',
        type: 'heat_pump',
        tonnage: 5.0,
        seer: 16,
        hspf: 9.5,
        refrigerant: 'R410A',
        created_at: '2024-01-01'
      }
    ];

    defaultOptions = {
      enabledStrategies: ['exact_sku', 'exact_model', 'model_fuzzy', 'specifications'],
      confidenceThreshold: 0.5,
      maxResults: 10,
      useAI: true,
      strictMode: false,
      specifications: {
        tonnageTolerance: 0.5,
        seerTolerance: 2.0,
        afueTolerance: 2.0,
        hspfTolerance: 0.5
      },
      enableWebResearch: true,
      researchDepth: 'thorough',
      researchTimeout: 30000,
      autoSubmitHighConfidence: true,
      highConfidenceThreshold: 0.85,
      requireManualReview: false,
      learnFromResults: true
    };
  });

  describe('Basic Matching Engine', () => {
    test('should initialize with all strategies', async () => {
      const availableStrategies = matchingEngine.getAvailableStrategies();
      
      expect(availableStrategies).toHaveLength(4);
      expect(availableStrategies.map(s => s.method)).toContain('exact_sku');
      expect(availableStrategies.map(s => s.method)).toContain('exact_model');
      expect(availableStrategies.map(s => s.method)).toContain('model_fuzzy');
      expect(availableStrategies.map(s => s.method)).toContain('specifications');
    });

    test('should find exact matches with high confidence', async () => {
      // Create exact match scenario
      const exactCompetitor: CompetitorProduct = {
        sku: 'LEN-036-16', // Exact match to our product
        company: 'Test Company',
        price: 2500
      };

      const result = await matchingEngine.findMatches({
        competitorProduct: exactCompetitor,
        ourProducts: testOurProducts,
        options: defaultOptions
      });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].matchMethod).toBe('exact_sku');
      expect(result.matches[0].confidence).toBeGreaterThan(0.9);
      expect(result.matches[0].ourSku).toBe('LEN-036-16');
    });

    test('should find specification-based matches', async () => {
      const result = await matchingEngine.findMatches({
        competitorProduct: testCompetitorProducts[0], // Trane 3-ton unit
        ourProducts: testOurProducts,
        options: defaultOptions
      });

      expect(result.matches.length).toBeGreaterThan(0);
      
      const specMatch = result.matches.find(m => m.matchMethod === 'specifications');
      expect(specMatch).toBeDefined();
      expect(specMatch?.confidence).toBeGreaterThan(0.6);
      
      // Should match with our 3-ton unit
      expect(specMatch?.ourProduct.tonnage).toBe(3.0);
    });

    test('should handle products with no matches', async () => {
      const unmatchableProduct: CompetitorProduct = {
        sku: 'WEIRD-PRODUCT-999',
        company: 'Unknown',
        price: 50000, // Unreasonable price
        description: 'Some weird industrial equipment'
      };

      const result = await matchingEngine.findMatches({
        competitorProduct: unmatchableProduct,
        ourProducts: testOurProducts,
        options: defaultOptions
      });

      expect(result.matches).toHaveLength(0);
      expect(result.confidence).toBe('none');
    });

    test('should respect confidence threshold', async () => {
      const strictOptions = {
        ...defaultOptions,
        confidenceThreshold: 0.9 // Very high threshold
      };

      const result = await matchingEngine.findMatches({
        competitorProduct: testCompetitorProducts[0],
        ourProducts: testOurProducts,
        options: strictOptions
      });

      // Should filter out low-confidence matches
      result.matches.forEach(match => {
        expect(match.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('Individual Strategy Tests', () => {
    test('ExactMatchStrategy - should find exact SKU matches', async () => {
      const strategy = new ExactMatchStrategy();
      
      const exactCompetitor: CompetitorProduct = {
        sku: 'LEN-048-18',
        company: 'Test',
        price: 3000
      };

      const matches = await strategy.findMatches(
        exactCompetitor,
        testOurProducts,
        defaultOptions
      );

      expect(matches).toHaveLength(1);
      expect(matches[0].matchMethod).toBe('exact_sku');
      expect(matches[0].confidence).toBeGreaterThan(0.95);
    });

    test('ModelMatchStrategy - should find fuzzy model matches', async () => {
      const strategy = new ModelMatchStrategy();
      
      const similarModel: CompetitorProduct = {
        sku: 'COMP-MODEL',
        company: 'Test',
        model: 'EL16XC036', // Similar to EL16XC1036
        price: 2500
      };

      const matches = await strategy.findMatches(
        similarModel,
        testOurProducts,
        defaultOptions
      );

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].matchMethod).toBe('model_fuzzy');
    });

    test('SpecificationMatchStrategy - should match by specs', async () => {
      const strategy = new SpecificationMatchStrategy();
      
      const result = await strategy.findMatches(
        testCompetitorProducts[1], // Carrier 4-ton unit
        testOurProducts,
        defaultOptions
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].matchMethod).toBe('specifications');
      
      // Should match with our 4-ton unit
      const match = result[0];
      expect(match.ourProduct.tonnage).toBe(4.0);
      expect(match.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Confidence Scoring', () => {
    test('should calculate confidence scores correctly', () => {
      const scorer = new ConfidenceScorer();
      
      // Mock match result with high confidence
      const highConfidenceMatch = {
        ourSku: 'LEN-036-16',
        ourProduct: testOurProducts[0],
        confidence: 0.95,
        matchMethod: 'exact_sku' as const,
        reasoning: ['Exact SKU match'],
        score: {
          exact: 1.0,
          model: 0.0,
          specifications: 0.0,
          overall: 0.95
        }
      };

      const finalConfidence = scorer.calculateConfidence(
        highConfidenceMatch,
        testCompetitorProducts[0]
      );

      expect(finalConfidence).toBeGreaterThan(0.9);
      expect(finalConfidence).toBeLessThanOrEqual(1.0);
    });

    test('should combine multiple matches correctly', () => {
      const scorer = new ConfidenceScorer();
      
      const multipleMatches = [
        {
          ourSku: 'LEN-036-16',
          ourProduct: testOurProducts[0],
          confidence: 0.85,
          matchMethod: 'specifications' as const,
          reasoning: ['Spec match'],
          score: { exact: 0, model: 0, specifications: 0.85, overall: 0.85 }
        },
        {
          ourSku: 'LEN-036-16', // Same SKU
          ourProduct: testOurProducts[0],
          confidence: 0.75,
          matchMethod: 'model_fuzzy' as const,
          reasoning: ['Model match'],
          score: { exact: 0, model: 0.75, specifications: 0, overall: 0.75 }
        }
      ];

      const combined = scorer.combineMultipleMatches(
        multipleMatches,
        testCompetitorProducts[0]
      );

      expect(combined).toHaveLength(1); // Should combine same SKU
      expect(combined[0].matchMethod).toBe('hybrid');
      expect(combined[0].confidence).toBeGreaterThan(0.85);
    });

    test('should provide confidence level descriptions', () => {
      const scorer = new ConfidenceScorer();
      
      expect(scorer.getConfidenceLevel(0.95)).toBe('high');
      expect(scorer.getConfidenceLevel(0.75)).toBe('medium');
      expect(scorer.getConfidenceLevel(0.55)).toBe('low');
      expect(scorer.getConfidenceLevel(0.25)).toBe('none');
    });
  });

  describe('Enhanced Matching Service Integration', () => {
    test('should process single product through full pipeline', async () => {
      const result = await enhancedMatchingService.enhancedMatch(
        testCompetitorProducts[0],
        testOurProducts,
        defaultOptions
      );

      expect(result.competitorProduct).toEqual(testCompetitorProducts[0]);
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.confidenceLevel).toMatch(/excellent|good|fair|poor|none/);
      expect(result.recommendedAction).toMatch(/approve|review|research|reject/);
      expect(result.enhancementNotes).toBeInstanceOf(Array);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('should handle batch processing', async () => {
      const progressCallback = jest.fn();
      
      const results = await enhancedMatchingService.batchProcessEnhanced(
        testCompetitorProducts.slice(0, 2), // Process first 2 products
        testOurProducts,
        defaultOptions,
        progressCallback
      );

      expect(results).toHaveLength(2);
      expect(progressCallback).toHaveBeenCalled();
      
      // Check that progress was reported
      const lastCall = progressCallback.mock.calls[progressCallback.mock.calls.length - 1][0];
      expect(lastCall.stage).toBe('complete');
    });

    test('should apply knowledge base suggestions', async () => {
      // Pre-populate knowledge base with a known mapping
      await knowledgeBaseService.catalogueResearchResults(
        testCompetitorProducts[0],
        {
          competitorProduct: testCompetitorProducts[0],
          searchResults: [],
          enhancedSpecs: { verified: true },
          suggestedMatches: [],
          confidence: 0.9,
          researchNotes: ['Test knowledge'],
          needsManualReview: false,
          processingTime: 1000
        }
      );

      const result = await enhancedMatchingService.enhancedMatch(
        testCompetitorProducts[0],
        testOurProducts,
        defaultOptions
      );

      expect(result.knowledgeApplied).toBe(true);
      expect(result.enhancementNotes.some(note => 
        note.includes('knowledge')
      )).toBe(true);
    });

    test('should queue items for manual review when needed', async () => {
      const lowConfidenceOptions = {
        ...defaultOptions,
        requireManualReview: true,
        highConfidenceThreshold: 0.95 // Very high threshold
      };

      const result = await enhancedMatchingService.enhancedMatch(
        testCompetitorProducts[2], // Unknown product
        testOurProducts,
        lowConfidenceOptions
      );

      expect(result.reviewStatus).toBe('queued');
      expect(result.reviewItemId).toBeDefined();
      expect(result.recommendedAction).toBe('review');
    });
  });

  describe('System Status and Performance', () => {
    test('should track processing statistics', async () => {
      // Process several products to generate stats
      for (const product of testCompetitorProducts.slice(0, 2)) {
        await matchingEngine.findMatches({
          competitorProduct: product,
          ourProducts: testOurProducts,
          options: defaultOptions
        });
      }

      const stats = matchingEngine.getStats();
      
      expect(stats.totalProcessed).toBeGreaterThan(0);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(typeof stats.averageConfidence).toBe('number');
    });

    test('should provide system status information', async () => {
      const systemStatus = await enhancedMatchingService.getSystemStatus();
      
      expect(systemStatus).toHaveProperty('matching');
      expect(systemStatus).toHaveProperty('knowledge');
      expect(systemStatus).toHaveProperty('review');
      expect(systemStatus).toHaveProperty('performance');
      
      expect(systemStatus.matching.processed).toBeGreaterThanOrEqual(0);
      expect(systemStatus.performance.uptime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle malformed competitor products', async () => {
      const malformedProduct: CompetitorProduct = {
        sku: '', // Empty SKU
        company: '',
        price: -100 // Negative price
      };

      const result = await matchingEngine.findMatches({
        competitorProduct: malformedProduct,
        ourProducts: testOurProducts,
        options: defaultOptions
      });

      expect(result.matches).toHaveLength(0);
      expect(result.confidence).toBe('none');
    });

    test('should handle empty product catalogs', async () => {
      const result = await matchingEngine.findMatches({
        competitorProduct: testCompetitorProducts[0],
        ourProducts: [], // Empty catalog
        options: defaultOptions
      });

      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidates).toBe(0);
    });

    test('should handle network timeouts gracefully', async () => {
      const shortTimeoutOptions = {
        ...defaultOptions,
        researchTimeout: 1 // Very short timeout
      };

      const result = await enhancedMatchingService.enhancedMatch(
        testCompetitorProducts[2], // Unknown product that would trigger research
        testOurProducts,
        shortTimeoutOptions
      );

      // Should still return a result even if research fails
      expect(result).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Data Export and Integration', () => {
    test('should export results in multiple formats', async () => {
      const results = await Promise.all(
        testCompetitorProducts.slice(0, 2).map(product =>
          enhancedMatchingService.enhancedMatch(product, testOurProducts, defaultOptions)
        )
      );

      // Test CSV export
      const csvExport = await enhancedMatchingService.exportEnhancedResults(results, 'csv');
      expect(typeof csvExport).toBe('string');
      expect(csvExport).toContain('Competitor SKU');
      expect(csvExport).toContain('Confidence');

      // Test JSON export
      const jsonExport = await enhancedMatchingService.exportEnhancedResults(results, 'json');
      expect(typeof jsonExport).toBe('string');
      const parsed = JSON.parse(jsonExport as string);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    test('should validate input data properly', () => {
      const validation = enhancedMatchingService.validateCompetitorProduct(
        testCompetitorProducts[0]
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      const invalidValidation = enhancedMatchingService.validateCompetitorProduct({
        sku: '',
        company: '',
        price: -100
      });
      
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    test('should process large batches efficiently', async () => {
      // Create a larger test dataset
      const largeBatch = Array.from({ length: 50 }, (_, i) => ({
        sku: `TEST-SKU-${i}`,
        company: 'Test Company',
        price: 1000 + i * 100,
        description: `Test product ${i}`
      }));

      const startTime = Date.now();
      
      const results = await enhancedMatchingService.batchProcessEnhanced(
        largeBatch,
        testOurProducts,
        { ...defaultOptions, enableWebResearch: false } // Disable research for speed
      );

      const processingTime = Date.now() - startTime;
      
      expect(results).toHaveLength(50);
      expect(processingTime).toBeLessThan(30000); // Should finish within 30 seconds
      
      // Verify all results have required properties
      results.forEach(result => {
        expect(result).toHaveProperty('competitorProduct');
        expect(result).toHaveProperty('matches');
        expect(result).toHaveProperty('confidenceLevel');
        expect(result).toHaveProperty('processingTime');
      });
    });

    test('should maintain performance under concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        enhancedMatchingService.enhancedMatch(
          testCompetitorProducts[i % testCompetitorProducts.length],
          testOurProducts,
          defaultOptions
        )
      );

      const startTime = Date.now();
      const results = await Promise.all(concurrentRequests);
      const totalTime = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(totalTime).toBeLessThan(15000); // Should handle concurrent requests efficiently
      
      // All requests should complete successfully
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.processingTime).toBeGreaterThan(0);
      });
    });
  });
});

describe('Manual Review Service Integration', () => {
  let reviewService: ManualReviewService;
  
  beforeEach(() => {
    reviewService = new ManualReviewService();
  });

  test('should add items to review queue', async () => {
    const testProduct: CompetitorProduct = {
      sku: 'REVIEW-TEST',
      company: 'Test Company',
      price: 2500
    };

    const reviewId = await reviewService.addToReviewQueue(
      testProduct,
      [], // No matches found
      undefined,
      'high'
    );

    expect(reviewId).toBeDefined();
    expect(typeof reviewId).toBe('string');

    const queue = await reviewService.getReviewQueue();
    expect(queue.pending.length).toBeGreaterThan(0);
    expect(queue.pendingHighPriority).toBeGreaterThan(0);
  });

  test('should generate comprehensive review reports', async () => {
    const timeframe = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: new Date()
    };

    const report = await reviewService.generateReviewReport(timeframe);

    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('byPriority');
    expect(report).toHaveProperty('byReviewer');
    expect(report).toHaveProperty('flagAnalysis');
    expect(report).toHaveProperty('trends');
  });
});

describe('Knowledge Base Service Integration', () => {
  let knowledgeService: KnowledgeBaseService;
  
  beforeEach(() => {
    knowledgeService = new KnowledgeBaseService();
  });

  test('should store and retrieve knowledge entries', async () => {
    const testProduct: CompetitorProduct = {
      sku: 'KNOWLEDGE-TEST',
      company: 'Test Company',
      price: 2500
    };

    const mockResearchResult = {
      competitorProduct: testProduct,
      searchResults: [],
      enhancedSpecs: { tonnage: 3.0, seer: 16 },
      suggestedMatches: [],
      confidence: 0.8,
      researchNotes: ['Test research'],
      needsManualReview: false,
      processingTime: 1000
    };

    await knowledgeService.catalogueResearchResults(testProduct, mockResearchResult);

    const retrievedKnowledge = await knowledgeService.queryKnowledge(testProduct);
    expect(retrievedKnowledge).toBeDefined();
    expect(retrievedKnowledge?.competitorSku).toBe('KNOWLEDGE-TEST');
  });

  test('should export and import knowledge base', async () => {
    const exportData = await knowledgeService.exportKnowledgeBase();
    
    expect(exportData).toHaveProperty('entries');
    expect(exportData).toHaveProperty('patterns');
    expect(exportData).toHaveProperty('metadata');
    expect(exportData.metadata).toHaveProperty('exportDate');
    expect(exportData.metadata).toHaveProperty('version');

    // Test import
    await knowledgeService.importKnowledgeBase({
      entries: exportData.entries,
      patterns: exportData.patterns
    });

    const stats = await knowledgeService.getStats();
    expect(stats.totalEntries).toEqual(exportData.entries.length);
  });
});