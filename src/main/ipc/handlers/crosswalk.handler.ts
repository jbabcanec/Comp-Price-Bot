import { ipcMain } from 'electron';
import * as crypto from 'crypto';
import { logger } from '../../services/logger.service';
import { getDatabaseService } from '../../database';
import { CompetitorProduct } from '@shared/types/matching.types';
import { SequentialMatchingService, mapMatchMethodToDatabase } from '../../services/sequential-matching.service';

/**
 * IPC handlers for crosswalk matching operations
 */
export function registerCrosswalkHandlers(): void {
  logger.info('crosswalk', 'Registering crosswalk matching IPC handlers');
  
  // Initialize sequential matching service
  const sequentialMatcher = new SequentialMatchingService();

  /**
   * Start crosswalk matching for competitor products
   */
  ipcMain.handle('crosswalk:match', async (_, competitorProducts: CompetitorProduct[]) => {
    const startTime = Date.now();
    logger.info('crosswalk', `Starting crosswalk matching for ${competitorProducts.length} products`);

    try {
      const dbService = getDatabaseService();
      
      // Get our products from database for matching
      const ourProductsResult = await dbService.products.findAll();
      const ourProducts = ourProductsResult;
      logger.debug('crosswalk', `Loaded ${ourProducts.length} products from our catalog for matching`);

      if (ourProducts.length === 0) {
        throw new Error('No products found in our catalog. Please import your price book first.');
      }

      const results = [];
      const matchingStats = {
        total: competitorProducts.length,
        matched: 0,
        noMatch: 0,
        highConfidence: 0,
        mediumConfidence: 0,
        lowConfidence: 0,
        aiMatches: 0
      };

      // Process each competitor product
      for (let i = 0; i < competitorProducts.length; i++) {
        const competitor = competitorProducts[i];
        logger.debug('crosswalk', `Processing competitor product ${i + 1}/${competitorProducts.length}: ${competitor.sku}`);

        try {
          // Convert Product[] to OurProduct[] format
          const ourProductsFormatted = ourProducts.map(p => ({
            id: p.id || 0,
            sku: p.sku,
            model: p.model,
            brand: p.brand,
            type: p.type,
            tonnage: p.tonnage,
            seer: p.seer,
            seer2: p.seer2,
            afue: p.afue,
            hspf: p.hspf,
            refrigerant: p.refrigerant,
            stage: p.stage,
            created_at: p.created_at
          }));
          
          // Use sequential matching with proper fallback chain
          const matchResult = await sequentialMatcher.performSequentialMatch(competitor, ourProductsFormatted);
          const matches = matchResult.matches;
          
          // Log the processing steps for transparency
          logger.debug('crosswalk', `Processing steps for ${competitor.sku}:`, {
            steps: matchResult.processingSteps,
            stage: matchResult.matchingStage
          });
          
          if (matches.length > 0) {
            matchingStats.matched++;
            const bestMatch = matches[0];
            
            if (bestMatch.confidence >= 0.8) matchingStats.highConfidence++;
            else if (bestMatch.confidence >= 0.6) matchingStats.mediumConfidence++;
            else matchingStats.lowConfidence++;

            // Track AI matches
            if (matchResult.matchingStage === 'ai_enhanced') {
              matchingStats.aiMatches = (matchingStats.aiMatches || 0) + 1;
            }

            // Save the match to database
            await dbService.mappings.create({
              our_sku: bestMatch.ourSku,
              competitor_sku: competitor.sku,
              competitor_company: competitor.company,
              confidence: bestMatch.confidence,
              match_method: mapMatchMethodToDatabase(bestMatch.matchMethod),
              verified: bestMatch.confidence >= 0.9, // Auto-verify high confidence matches
              notes: `Stage: ${matchResult.matchingStage}, Price: $${competitor.price || 'N/A'}, ${bestMatch.reasoning.join(', ')}`
            });

            logger.info('crosswalk', `Match found: ${competitor.sku} -> ${bestMatch.ourSku} (${(bestMatch.confidence * 100).toFixed(1)}% confidence) via ${matchResult.matchingStage}`);
          } else {
            matchingStats.noMatch++;
            logger.debug('crosswalk', `No match found for ${competitor.sku} after all stages`);
          }

          results.push({
            competitor,
            matches,
            processed: true,
            matchingDetails: {
              stage: matchResult.matchingStage,
              steps: matchResult.processingSteps,
              aiEnhancement: matchResult.aiEnhancement,
              webResearchData: matchResult.webResearchData
            }
          });

        } catch (error) {
          logger.error('crosswalk', `Failed to process ${competitor.sku}`, error instanceof Error ? error : new Error(String(error)));
          results.push({
            competitor,
            matches: [],
            processed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const processingTime = Date.now() - startTime;
      
      // Add to processing history
      const fileName = `Crosswalk-${Date.now()}`;
      
      // Create a proper deterministic hash for the competitor products
      const sortedProducts = competitorProducts
        .map(p => ({ sku: p.sku, company: p.company, price: p.price }))
        .sort((a, b) => `${a.company}-${a.sku}`.localeCompare(`${b.company}-${b.sku}`));
      const fileHash = crypto.createHash('sha256')
        .update(JSON.stringify(sortedProducts))
        .digest('hex');
      
      // Check if this exact data has been processed before
      try {
        const existingHistory = await dbService.history.findByFileHash?.(fileHash);
        if (existingHistory) {
          logger.info('crosswalk', 'Data already processed, updating existing record', {
            existingId: existingHistory.id,
            fileHash: fileHash.substring(0, 8)
          });
          
          return {
            success: true,
            results,
            stats: matchingStats,
            processingTime,
            historyId: existingHistory.id,
            message: 'Data previously processed - results refreshed'
          };
        }
      } catch (error) {
        // If findByFileHash doesn't exist, continue with creation
        logger.debug('crosswalk', 'No existing history check available, proceeding with creation');
      }
      
      const historyId = await dbService.history.createHistoryRecord({
        fileName,
        fileHash,
        companyName: 'Mixed Competitors',
        totalItems: competitorProducts.length,
        matchedItems: matchingStats.matched,
        unmatchedItems: matchingStats.noMatch,
        averageConfidence: matchingStats.matched > 0 ? 0.75 : 0, // Approximate
        processingTimeMs: processingTime,
        exactMatches: matchingStats.highConfidence,
        fuzzyMatches: matchingStats.mediumConfidence,
        specMatches: matchingStats.lowConfidence,
        aiMatches: 0,
        reviewRequired: matchingStats.lowConfidence,
        fileSize: JSON.stringify(competitorProducts).length
      });
      
      logger.info('crosswalk', `Crosswalk matching completed`, {
        totalProducts: competitorProducts.length,
        matched: matchingStats.matched,
        noMatch: matchingStats.noMatch,
        processingTimeMs: processingTime
      });

      return {
        success: true,
        results,
        stats: matchingStats,
        processingTime,
        historyId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      logger.error('crosswalk', 'Crosswalk matching failed', error instanceof Error ? error : new Error(errorMessage));
      
      return {
        success: false,
        error: errorMessage,
        results: [],
        stats: null,
        processingTime: Date.now() - startTime
      };
    }
  });

  /**
   * Get crosswalk matching history
   */
  ipcMain.handle('crosswalk:get-history', async () => {
    try {
      const dbService = getDatabaseService();
      const history = await dbService.history.getAllHistory(50);
      
      return {
        success: true,
        history
      };
    } catch (error) {
      logger.error('crosswalk', 'Failed to get crosswalk history', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get history'
      };
    }
  });

  /**
   * Get all crosswalk matches
   */
  ipcMain.handle('crosswalk:get-matches', async () => {
    try {
      const dbService = getDatabaseService();
      const matches = await dbService.mappings.findAll();
      
      return {
        success: true,
        matches
      };
    } catch (error) {
      logger.error('crosswalk', 'Failed to get crosswalk matches', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get matches'
      };
    }
  });

  logger.info('crosswalk', 'Crosswalk matching IPC handlers registered');
}

