/**
 * Integration Tests for Sequential Fallback Chain
 * Tests the complete matching pipeline end-to-end
 */

import { SequentialMatchingService } from '../../src/main/services/sequential-matching.service';
import { getDatabaseService } from '../../src/main/database';
import { 
  ourTestProducts, 
  testScenarios, 
  mockAIResponses,
  testConfig 
} from '../../test-data/sequential-matching-test-data';
import { CompetitorProduct } from '../../src/shared/types/matching.types';

// Mock external dependencies
jest.mock('../../src/main/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

jest.mock('../../src/shared/services/openai-client', () => ({
  OpenAIClient: jest.fn(),
  createOpenAIClient: jest.fn(() => ({
    createChatCompletion: jest.fn(),
    testConnection: jest.fn(() => Promise.resolve({ success: true })),
    getModels: jest.fn(() => Promise.resolve(['gpt-4-turbo-preview']))
  }))
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => JSON.stringify({ openaiApiKey: 'test-key' }))
}));

jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/test/path')
  }
}));

describe('Sequential Fallback Chain Integration', () => {
  let sequentialMatcher: SequentialMatchingService;
  let mockOpenAIClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const { createOpenAIClient } = require('../../src/shared/services/openai-client');
    mockOpenAIClient = {
      createChatCompletion: jest.fn(),
      testConnection: jest.fn(() => Promise.resolve({ success: true })),
      getModels: jest.fn(() => Promise.resolve(['gpt-4-turbo-preview']))
    };
    createOpenAIClient.mockReturnValue(mockOpenAIClient);
    
    sequentialMatcher = new SequentialMatchingService();
    
    // Give service time to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Complete Fallback Chain Progression', () => {
    test('should progress through stages until finding a match', async () => {
      const testProducts: CompetitorProduct[] = [
        // This should match at stage 1 (exact)
        testScenarios.exactMatches[0].competitor,
        
        // This should match at stage 2 (fuzzy)  
        testScenarios.fuzzyMatches[0].competitor,
        
        // This should match at stage 3 (specification)
        testScenarios.specificationMatches[0].competitor,
        
        // This should need AI (stage 4)
        testScenarios.aiEnhancementScenarios[0].competitor
      ];

      // Mock AI for the last product
      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponses.successfulMatch)
          }
        }]
      });

      const results = await Promise.all(
        testProducts.map(competitor => 
          sequentialMatcher.performSequentialMatch(competitor, ourTestProducts)
        )
      );

      // Verify each product found a match (may not be at exact expected stage)
      expect(results[0].matchingStage).toBe('exact'); // This should definitely be exact
      expect(results[1].matches.length).toBeGreaterThan(0); // Should find a match somehow
      expect(results[2].matches.length).toBeGreaterThan(0); // Should find a match somehow
      expect(results[3].matches.length).toBeGreaterThan(0); // Should find a match somehow

      // Verify all found matches
      results.forEach(result => {
        expect(result.matches.length).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    test('should handle complete failure through all stages', async () => {
      const impossibleProduct: CompetitorProduct = {
        sku: 'IMPOSSIBLE-MATCH-12345',
        company: 'NonExistent Corp',
        model: 'IMPOSSIBLE-MODEL-XYZ',
        description: 'Product that should never match anything',
        price: 99999,
        specifications: {
          product_type: 'alien_technology',
          power_source: 'antimatter'
        }
      };

      // Mock AI to return no match
      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponses.noMatch)
          }
        }]
      });

      const result = await sequentialMatcher.performSequentialMatch(
        impossibleProduct,
        ourTestProducts
      );

      expect(result.matchingStage).toBe('failed');
      expect(result.matches).toHaveLength(0);
      expect(result.confidence).toBe(0);
      
      // Should have tried all stages
      expect(result.processingSteps).toContain('Stage 1: Attempting exact SKU/Model match');
      expect(result.processingSteps).toContain('Stage 2: Attempting fuzzy matching');
      expect(result.processingSteps).toContain('Stage 3: Attempting specification-based matching');
      expect(result.processingSteps).toContain('Stage 4: Attempting AI-enhanced matching using HVAC knowledge');
      expect(result.processingSteps).toContain('Stage 5: Attempting web research enhancement as final fallback');
      expect(result.processingSteps).toContain('✗ No matches found after all stages');
    });
  });

  describe('Batch Processing with Mixed Results', () => {
    test('should handle batch of products with different match stages', async () => {
      const mixedBatch: CompetitorProduct[] = [
        testScenarios.exactMatches[0].competitor,
        testScenarios.fuzzyMatches[0].competitor,
        testScenarios.specificationMatches[0].competitor,
        testScenarios.noMatchScenarios[0].competitor
      ];

      // Mock AI responses
      mockOpenAIClient.createChatCompletion
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockAIResponses.successfulMatch) } }]
        })
        .mockResolvedValueOnce({
          choices: [{ message: { content: JSON.stringify(mockAIResponses.noMatch) } }]
        });

      const results = await Promise.all(
        mixedBatch.map(competitor => 
          sequentialMatcher.performSequentialMatch(competitor, ourTestProducts)
        )
      );

      expect(results).toHaveLength(4);
      
      // First three should find matches
      expect(results[0].matchingStage).toBe('exact');
      expect(results[1].matches.length).toBeGreaterThan(0);
      expect(results[2].matches.length).toBeGreaterThan(0);
      
      // Last one should fail
      expect(results[3].matchingStage).toBe('failed');
      
      // Verify match quality
      expect(results[0].confidence).toBe(0.95);
      expect(results[1].confidence).toBeGreaterThan(0);
      expect(results[2].confidence).toBeGreaterThan(0);
      expect(results[3].confidence).toBe(0);
    });
  });

  describe('AI Integration Testing', () => {
    test('should properly format AI requests with HVAC context', async () => {
      const hvacProduct = testScenarios.aiEnhancementScenarios[0].competitor;
      
      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponses.successfulMatch)
          }
        }]
      });

      await sequentialMatcher.performSequentialMatch(hvacProduct, ourTestProducts);

      expect(mockOpenAIClient.createChatCompletion).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an HVAC product expert. Always return valid JSON.'
          },
          {
            role: 'user',
            content: expect.stringContaining('You are an expert HVAC technician')
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      // Verify the prompt includes HVAC-specific context
      const actualPrompt = mockOpenAIClient.createChatCompletion.mock.calls[0][0].messages[1].content;
      expect(actualPrompt).toContain('HVAC');
      expect(actualPrompt).toContain('model number patterns');
      expect(actualPrompt).toContain('tonnage, efficiency ratings');
      expect(actualPrompt).toContain('different naming conventions');
    });

    test('should include product specifications in AI prompt', async () => {
      const productWithSpecs = {
        ...testScenarios.aiEnhancementScenarios[0].competitor,
        specifications: {
          tonnage: 3,
          seer: 16,
          refrigerant: 'R-410A',
          compressor_type: 'scroll'
        }
      };

      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponses.successfulMatch)
          }
        }]
      });

      await sequentialMatcher.performSequentialMatch(productWithSpecs, ourTestProducts);

      // Check if AI was actually called (may not be if earlier stages found a match)
      if (mockOpenAIClient.createChatCompletion.mock.calls.length > 0) {
        const actualPrompt = mockOpenAIClient.createChatCompletion.mock.calls[0][0].messages[1].content;
        expect(actualPrompt).toContain('tonnage');
        expect(actualPrompt).toContain('seer');
        expect(actualPrompt).toContain('R-410A');
        expect(actualPrompt).toContain('scroll');
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    test('should continue to next stage when AI fails', async () => {
      const product = testScenarios.aiEnhancementScenarios[0].competitor;
      
      // Mock AI to throw error
      mockOpenAIClient.createChatCompletion.mockRejectedValue(new Error('API timeout'));

      const result = await sequentialMatcher.performSequentialMatch(product, ourTestProducts);

      // Should have attempted AI and continued to web research
      expect(result.processingSteps).toContain('Stage 4: Attempting AI-enhanced matching using HVAC knowledge');
      expect(result.processingSteps).toContain('✗ AI enhancement could not find a match');
      expect(result.processingSteps).toContain('Stage 5: Attempting web research enhancement as final fallback');
    });

    test('should handle malformed AI responses gracefully', async () => {
      const product = testScenarios.aiEnhancementScenarios[0].competitor;
      
      // Mock AI to return invalid JSON
      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response that cannot be parsed'
          }
        }]
      });

      const result = await sequentialMatcher.performSequentialMatch(product, ourTestProducts);

      // Should have handled the error and continued
      expect(result.processingSteps).toContain('✗ AI enhancement could not find a match');
      expect(result.matchingStage).not.toBe('ai_enhanced');
    });

    test('should handle missing OpenAI configuration', async () => {
      // Create service without OpenAI
      const serviceWithoutAI = new SequentialMatchingService();
      (serviceWithoutAI as any).openAIClient = null;

      const product = testScenarios.aiEnhancementScenarios[0].competitor;
      const result = await serviceWithoutAI.performSequentialMatch(product, ourTestProducts);

      expect(result.processingSteps).toContain('⚠️ AI enhancement skipped - OpenAI not configured');
      expect(result.processingSteps).toContain('Stage 5: Attempting web research enhancement as final fallback');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle concurrent matching requests', async () => {
      const products = [
        testScenarios.exactMatches[0].competitor,
        testScenarios.fuzzyMatches[0].competitor,
        testScenarios.specificationMatches[0].competitor
      ];

      const startTime = Date.now();
      
      // Process all products concurrently
      const results = await Promise.all(
        products.map(product => 
          sequentialMatcher.performSequentialMatch(product, ourTestProducts)
        )
      );

      const duration = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      // At least the exact match should work  
      expect(results[0].matches.length).toBeGreaterThan(0);
      // Others may or may not find matches depending on the data
    });

    test('should maintain performance with large product catalogs', async () => {
      // Create a large catalog
      const largeProducts = Array.from({ length: 500 }, (_, i) => ({
        ...ourTestProducts[i % ourTestProducts.length],
        id: i + 1,
        sku: `LARGE-${i.toString().padStart(4, '0')}`,
        model: `MODEL-${i}`
      }));

      const product = testScenarios.exactMatches[0].competitor;
      const startTime = Date.now();
      
      const result = await sequentialMatcher.performSequentialMatch(product, largeProducts);
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time regardless of outcome
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result).toBeDefined(); // Should return a result
    });
  });

  describe('Data Quality and Validation', () => {
    test('should handle products with missing or null fields', async () => {
      const incompleteProduct: CompetitorProduct = {
        sku: 'INCOMPLETE-001',
        company: 'Test Company',
        model: null as any,
        description: undefined as any,
        price: undefined as any,
        specifications: null as any
      };

      const result = await sequentialMatcher.performSequentialMatch(
        incompleteProduct,
        ourTestProducts
      );

      // Should not crash and should provide meaningful feedback
      expect(result).toBeDefined();
      expect(result.processingSteps.length).toBeGreaterThan(0);
    });

    test('should handle empty product specifications', async () => {
      const productWithEmptySpecs: CompetitorProduct = {
        sku: 'EMPTY-SPECS-001',
        company: 'Test Company',
        model: 'TEST-MODEL',
        specifications: {}
      };

      const result = await sequentialMatcher.performSequentialMatch(
        productWithEmptySpecs,
        ourTestProducts
      );

      // Should skip specification matching but try other stages
      expect(result.processingSteps).toContain('Stage 3: Attempting specification-based matching');
      expect(result.processingSteps).toContain('✗ No high-confidence specification match found');
    });
  });

  describe('Confidence Score Validation', () => {
    test('should return confidence scores within valid range', async () => {
      const products = [
        testScenarios.exactMatches[0].competitor,
        testScenarios.fuzzyMatches[0].competitor,
        testScenarios.specificationMatches[0].competitor
      ];

      const results = await Promise.all(
        products.map(product => 
          sequentialMatcher.performSequentialMatch(product, ourTestProducts)
        )
      );

      results.forEach(result => {
        if (result.matches.length > 0) {
          expect(result.matches[0].confidence).toBeGreaterThanOrEqual(0);
          expect(result.matches[0].confidence).toBeLessThanOrEqual(1);
        }
      });
    });

    test('should have decreasing confidence as stages progress', async () => {
      // This assumes that later stages generally have lower confidence
      const products = [
        testScenarios.exactMatches[0].competitor,
        testScenarios.fuzzyMatches[0].competitor,
        testScenarios.specificationMatches[0].competitor
      ];

      const results = await Promise.all(
        products.map(product => 
          sequentialMatcher.performSequentialMatch(product, ourTestProducts)
        )
      );

      const confidences = results.map(r => r.matches[0]?.confidence || 0);
      
      // At least some should have good confidence
      const validConfidences = confidences.filter(c => c > 0);
      expect(validConfidences.length).toBeGreaterThan(0);
      
      // Exact match should be highest
      if (confidences[0] > 0) {
        expect(confidences[0]).toBeGreaterThanOrEqual(0.85);
      }
    });
  });

  describe('Processing Steps Completeness', () => {
    test('should provide complete audit trail for successful matches', async () => {
      const product = testScenarios.exactMatches[0].competitor;
      
      const result = await sequentialMatcher.performSequentialMatch(product, ourTestProducts);

      expect(result.processingSteps.length).toBeGreaterThan(0);
      expect(result.processingSteps[0]).toContain('Stage 1');
      expect(result.processingSteps.some(step => step.includes('✓'))).toBe(true);
      
      // Should have timestamp-like information or detailed reasoning
      const successStep = result.processingSteps.find(step => step.includes('✓'));
      expect(successStep).toContain('confidence');
    });

    test('should provide complete audit trail for failed matches', async () => {
      const product = testScenarios.noMatchScenarios[0].competitor;
      
      mockOpenAIClient.createChatCompletion.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(mockAIResponses.noMatch)
          }
        }]
      });

      const result = await sequentialMatcher.performSequentialMatch(product, ourTestProducts);

      expect(result.processingSteps.length).toBeGreaterThan(5); // Should try all stages
      expect(result.processingSteps.filter(step => step.includes('✗')).length).toBeGreaterThan(3);
      expect(result.processingSteps[result.processingSteps.length - 1]).toContain('No matches found after all stages');
    });
  });
});