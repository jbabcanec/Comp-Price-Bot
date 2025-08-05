import { AIExtractorService } from '../extraction/ai-extractor.service';
import { SequentialMatchingService } from '../sequential-matching.service';
import { DatabaseConnection } from '../../database/connection';
import { MappingsRepository } from '../../database/repositories/mappings.repo';
import { CrosswalkBatchResult, CrosswalkResult, TemporaryProduct } from './crosswalk.types';
import { ExtractedProduct } from '../extraction/extraction.types';
import { CompetitorProduct } from '@shared/types/matching.types';
import { logger } from '../logger.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * Crosswalk Orchestrator - Coordinates the complete AI-first workflow
 * 
 * Workflow:
 * 1. File → AI Extraction → Clean JSON
 * 2. Store products temporarily 
 * 3. Process each product systematically through matching pipeline
 * 4. Save approved mappings to database
 */
export class CrosswalkOrchestratorService {
  private aiExtractor: AIExtractorService;
  private sequentialMatcher: SequentialMatchingService;
  private mappingsRepo: MappingsRepository;
  private temporaryStorage: Map<string, TemporaryProduct[]> = new Map();

  constructor(openaiApiKey?: string) {
    this.aiExtractor = new AIExtractorService(openaiApiKey);
    this.sequentialMatcher = new SequentialMatchingService();
    
    // Initialize database connection and repository
    const dbConnection = new DatabaseConnection();
    this.mappingsRepo = new MappingsRepository(dbConnection);
    
    logger.info('crosswalk-orchestrator', 'Initialized with AI-first workflow');
  }

  /**
   * Process a file using the complete AI-first workflow
   */
  async processFile(filePath: string): Promise<CrosswalkBatchResult> {
    const startTime = Date.now();
    const batchId = uuidv4();
    const fileName = path.basename(filePath);
    
    logger.info('crosswalk-orchestrator', 'Starting AI-first file processing', {
      filePath,
      batchId
    });

    try {
      // Step 1: Extract products using AI FIRST
      logger.info('crosswalk-orchestrator', 'Step 1: AI extraction');
      const extractionResult = await this.aiExtractor.extractFromFile({ filePath });
      
      if (!extractionResult.success || extractionResult.products.length === 0) {
        return this.createFailureResult(batchId, fileName, startTime, 
          extractionResult.error || 'No products extracted');
      }

      logger.info('crosswalk-orchestrator', 'AI extraction successful', {
        productsFound: extractionResult.products.length,
        averageConfidence: extractionResult.metadata?.averageConfidence
      });

      // Step 2: Store products temporarily
      logger.info('crosswalk-orchestrator', 'Step 2: Temporary storage');
      const temporaryProducts = this.storeTemporarily(batchId, extractionResult.products);
      
      // Step 3: Process each product systematically
      logger.info('crosswalk-orchestrator', 'Step 3: Systematic crosswalk processing');
      const results: CrosswalkResult[] = [];
      
      for (let i = 0; i < temporaryProducts.length; i++) {
        const tempProduct = temporaryProducts[i];
        logger.debug('crosswalk-orchestrator', `Processing product ${i + 1}/${temporaryProducts.length}`, {
          sku: tempProduct.product.sku,
          brand: tempProduct.product.brand
        });

        try {
          const crosswalkResult = await this.processIndividualProduct(tempProduct.product);
          results.push(crosswalkResult);
          
          // Mark as processed
          tempProduct.processed = true;
          
        } catch (error) {
          logger.error('crosswalk-orchestrator', 'Failed to process individual product', 
            error instanceof Error ? error : new Error(String(error)), {
              sku: tempProduct.product.sku,
              brand: tempProduct.product.brand
            });
          
          // Create failed result
          results.push({
            competitorProduct: tempProduct.product,
            matches: [],
            processingStage: 'failed',
            processingSteps: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
            processingTime: 0
          });
        }
      }

      // Step 4: Generate summary
      const summary = this.generateBatchSummary(results);
      const processingTime = Date.now() - startTime;

      logger.info('crosswalk-orchestrator', 'AI-first processing complete', {
        batchId,
        totalProducts: results.length,
        summary,
        processingTime
      });

      return {
        batchId,
        sourceFile: fileName,
        totalProducts: extractionResult.products.length,
        processedProducts: results.length,
        results,
        summary,
        processingTime
      };

    } catch (error) {
      logger.error('crosswalk-orchestrator', 'File processing failed', 
        error instanceof Error ? error : new Error(String(error)));
      
      return this.createFailureResult(batchId, fileName, startTime, 
        error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Process a single product through the matching pipeline
   */
  private async processIndividualProduct(product: ExtractedProduct): Promise<CrosswalkResult> {
    const startTime = Date.now();
    const processingSteps: string[] = [];
    
    try {
      // Convert to format expected by sequential matcher
      const competitorProduct: CompetitorProduct = {
        sku: product.sku,
        company: product.brand,
        price: product.price || 0,
        model: product.model,
        description: product.description,
        specifications: product.specifications
      };

      processingSteps.push('Starting sequential matching pipeline');
      
      // Use sequential matcher to find matches - it needs our products catalog too
      // For now, we'll use an empty array until we have our products loaded
      const ourProducts: any[] = []; // TODO: Load our products from database
      const matchResult = await this.sequentialMatcher.performSequentialMatch(competitorProduct, ourProducts);
      
      if (matchResult.matches.length === 0) {
        processingSteps.push('No matches found in any stage');
        return {
          competitorProduct: product,
          matches: [],
          processingStage: 'failed',
          processingSteps,
          processingTime: Date.now() - startTime
        };
      }

      // Convert match results to our format
      const matches = matchResult.matches.map((match: any) => ({
        ourSku: match.ourSku,
        ourModel: match.ourProduct?.model || match.ourSku,
        confidence: match.confidence,
        matchMethod: match.matchMethod as any,
        reasoning: match.reasoning || [`Matched via ${match.matchMethod}`]
      }));

      const bestMatch = matches[0]; // Sequential matcher returns sorted by confidence
      const stage = this.determineProcessingStage(bestMatch.matchMethod);
      
      processingSteps.push(`Best match found: ${bestMatch.ourSku} (${Math.round(bestMatch.confidence * 100)}% confidence)`);

      return {
        competitorProduct: product,
        matches,
        bestMatch,
        processingStage: stage,
        processingSteps,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      processingSteps.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        competitorProduct: product,
        matches: [],
        processingStage: 'failed',
        processingSteps,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Store products temporarily for processing
   */
  private storeTemporarily(batchId: string, products: ExtractedProduct[]): TemporaryProduct[] {
    const temporaryProducts: TemporaryProduct[] = products.map(product => ({
      id: uuidv4(),
      batchId,
      product,
      processed: false,
      createdAt: new Date()
    }));

    this.temporaryStorage.set(batchId, temporaryProducts);
    
    logger.info('crosswalk-orchestrator', 'Products stored temporarily', {
      batchId,
      count: temporaryProducts.length
    });

    return temporaryProducts;
  }

  /**
   * Generate batch processing summary
   */
  private generateBatchSummary(results: CrosswalkResult[]) {
    const summary = {
      exactMatches: 0,
      fuzzyMatches: 0,
      specMatches: 0,
      aiMatches: 0,
      webMatches: 0,
      noMatches: 0,
      averageConfidence: 0
    };

    let totalConfidence = 0;
    let matchCount = 0;

    for (const result of results) {
      if (result.bestMatch) {
        switch (result.processingStage) {
          case 'exact':
            summary.exactMatches++;
            break;
          case 'fuzzy':
            summary.fuzzyMatches++;
            break;
          case 'specification':
            summary.specMatches++;
            break;
          case 'ai_enhanced':
            summary.aiMatches++;
            break;
          case 'web_research':
            summary.webMatches++;
            break;
        }
        totalConfidence += result.bestMatch.confidence;
        matchCount++;
      } else {
        summary.noMatches++;
      }
    }

    summary.averageConfidence = matchCount > 0 ? totalConfidence / matchCount : 0;

    return summary;
  }

  /**
   * Determine processing stage from match method
   */
  private determineProcessingStage(matchMethod: string): CrosswalkResult['processingStage'] {
    switch (matchMethod) {
      case 'exact_sku':
      case 'exact_model':
        return 'exact';
      case 'fuzzy':
        return 'fuzzy';
      case 'specification':
        return 'specification';
      case 'ai_enhanced':
        return 'ai_enhanced';
      case 'web_research':
        return 'web_research';
      default:
        return 'failed';
    }
  }

  /**
   * Create failure result
   */
  private createFailureResult(batchId: string, fileName: string, startTime: number, error: string): CrosswalkBatchResult {
    return {
      batchId,
      sourceFile: fileName,
      totalProducts: 0,
      processedProducts: 0,
      results: [],
      summary: {
        exactMatches: 0,
        fuzzyMatches: 0,
        specMatches: 0,
        aiMatches: 0,
        webMatches: 0,
        noMatches: 0,
        averageConfidence: 0
      },
      processingTime: Date.now() - startTime,
      error
    };
  }

  /**
   * Clean up temporary storage for a batch
   */
  cleanupBatch(batchId: string): void {
    this.temporaryStorage.delete(batchId);
    logger.debug('crosswalk-orchestrator', 'Cleaned up temporary storage', { batchId });
  }

  /**
   * Get temporary products for a batch
   */
  getTemporaryProducts(batchId: string): TemporaryProduct[] | undefined {
    return this.temporaryStorage.get(batchId);
  }
}