import { ipcMain } from 'electron';
import { logger } from '../../services/logger.service';
import { getDatabaseService } from '../../database';
import { CompetitorProduct } from '@shared/types/matching.types';

/**
 * IPC handlers for crosswalk matching operations
 */
export function registerCrosswalkHandlers(): void {
  logger.info('crosswalk', 'Registering crosswalk matching IPC handlers');

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
        lowConfidence: 0
      };

      // Process each competitor product
      for (let i = 0; i < competitorProducts.length; i++) {
        const competitor = competitorProducts[i];
        logger.debug('crosswalk', `Processing competitor product ${i + 1}/${competitorProducts.length}: ${competitor.sku}`);

        try {
          // Simple matching logic - in a real implementation, this would use the enhanced matching service
          const matches = await findMatches(competitor, ourProducts);
          
          if (matches.length > 0) {
            matchingStats.matched++;
            const bestMatch = matches[0];
            
            if (bestMatch.confidence >= 0.8) matchingStats.highConfidence++;
            else if (bestMatch.confidence >= 0.6) matchingStats.mediumConfidence++;
            else matchingStats.lowConfidence++;

            // Save the match to database
            await dbService.mappings.create({
              our_sku: bestMatch.ourSku,
              competitor_sku: competitor.sku,
              competitor_company: competitor.company,
              confidence: bestMatch.confidence,
              match_method: bestMatch.matchMethod,
              verified: bestMatch.confidence >= 0.9, // Auto-verify high confidence matches
              notes: `Competitor price: $${competitor.price || 'N/A'}, Description: ${competitor.description || 'N/A'}`
            });

            logger.info('crosswalk', `Match found: ${competitor.sku} -> ${bestMatch.ourSku} (${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
          } else {
            matchingStats.noMatch++;
            logger.debug('crosswalk', `No match found for ${competitor.sku}`);
          }

          results.push({
            competitor,
            matches,
            processed: true
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
      const fileHash = Buffer.from(JSON.stringify(competitorProducts)).toString('base64').substring(0, 32);
      
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

/**
 * Simple matching algorithm - finds potential matches for a competitor product
 */
async function findMatches(competitor: CompetitorProduct, ourProducts: any[]): Promise<any[]> {
  const matches = [];

  for (const ourProduct of ourProducts) {
    let confidence = 0;
    let matchMethod = 'none';
    const reasoning = [];

    // Exact SKU match
    if (competitor.sku.toUpperCase() === ourProduct.sku.toUpperCase()) {
      confidence = 0.95;
      matchMethod = 'exact_sku';
      reasoning.push('Exact SKU match');
    }
    // Model number match
    else if (competitor.model && ourProduct.model && 
             competitor.model.toUpperCase() === ourProduct.model.toUpperCase()) {
      confidence = 0.85;
      matchMethod = 'exact_model';
      reasoning.push('Exact model match');
    }
    // Fuzzy model match
    else if (competitor.model && ourProduct.model) {
      const similarity = calculateSimilarity(competitor.model, ourProduct.model);
      if (similarity > 0.8) {
        confidence = 0.7 * similarity;
        matchMethod = 'model_fuzzy';
        reasoning.push(`Fuzzy model match (${(similarity * 100).toFixed(1)}% similar)`);
      }
    }
    // Description-based matching
    else if (competitor.description && ourProduct.description) {
      const similarity = calculateSimilarity(competitor.description, ourProduct.description);
      if (similarity > 0.6) {
        confidence = 0.5 * similarity;
        matchMethod = 'description';
        reasoning.push(`Description similarity (${(similarity * 100).toFixed(1)}% similar)`);
      }
    }

    // Brand bonus
    if (competitor.company && ourProduct.brand) {
      const brandSimilarity = calculateSimilarity(competitor.company, ourProduct.brand);
      if (brandSimilarity > 0.8) {
        confidence += 0.1;
        reasoning.push('Brand match bonus');
      }
    }

    // Skip type matching - not available in CompetitorProduct interface

    if (confidence > 0.3) { // Minimum threshold
      matches.push({
        ourSku: ourProduct.sku,
        ourProduct,
        confidence: Math.min(confidence, 1.0),
        matchMethod,
        reasoning
      });
    }
  }

  // Sort by confidence descending
  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5); // Top 5 matches
}

/**
 * Simple string similarity calculation using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}