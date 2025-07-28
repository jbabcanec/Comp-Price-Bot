/**
 * Sequential Matching Service with Proper Fallback Chain
 * Implements a step-by-step matching approach with escalation to AI
 */

import { logger } from './logger.service';
import { CompetitorProduct, OurProduct, MatchResult, MatchMethod } from '@shared/types/matching.types';
import { OpenAIClient, createOpenAIClient } from '@shared/services/openai-client';
import { OpenAIProductSchema } from '@shared/services/openai-extractor';

export interface SequentialMatchResult {
  competitor: CompetitorProduct;
  matches: MatchResult[];
  matchingStage: 'exact' | 'fuzzy' | 'specification' | 'ai_enhanced' | 'web_research' | 'failed';
  confidence: number;
  processingSteps: string[];
  aiEnhancement?: {
    enhancedData: any;
    structuredOutput: OpenAIProductSchema;
  };
  webResearchData?: any;
}

// Map our internal match methods to database values
export function mapMatchMethodToDatabase(method: MatchMethod): 'exact' | 'model' | 'specs' | 'ai' | 'manual' {
  const mapping: Record<MatchMethod, 'exact' | 'model' | 'specs' | 'ai' | 'manual'> = {
    'exact_sku': 'exact',
    'exact_model': 'model',
    'model_fuzzy': 'model',
    'specifications': 'specs',
    'ai_enhanced': 'ai',
    'hybrid': 'ai',
    'existing_mapping': 'manual'
  };
  return mapping[method] || 'manual';
}

export class SequentialMatchingService {
  private openAIClient: OpenAIClient | null = null;
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.6;
  private readonly FUZZY_MATCH_THRESHOLD = 0.7;

  constructor() {
    this.initializeOpenAI();
  }

  private async initializeOpenAI() {
    try {
      const settings = await this.getSettings();
      if (settings?.openaiApiKey) {
        this.openAIClient = createOpenAIClient(settings.openaiApiKey);
        logger.info('sequential-matching', 'OpenAI client initialized');
      }
    } catch (error) {
      logger.error('sequential-matching', 'Failed to initialize OpenAI', error as Error);
    }
  }

  private async getSettings(): Promise<any> {
    // In main process, we need to access settings differently
    try {
      const { app } = require('electron');
      const fs = require('fs');
      const path = require('path');
      const settingsPath = path.join(app.getPath('userData'), 'settings.json');
      
      if (fs.existsSync(settingsPath)) {
        const data = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      logger.error('sequential-matching', 'Failed to load settings', error as Error);
    }
    return null;
  }

  /**
   * Main sequential matching method with proper fallback chain
   */
  async performSequentialMatch(
    competitor: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<SequentialMatchResult> {
    const processingSteps: string[] = [];
    let matches: MatchResult[] = [];
    let matchingStage: SequentialMatchResult['matchingStage'] = 'failed';
    let confidence = 0;

    logger.info('sequential-matching', `Starting sequential match for ${competitor.sku}`);

    // Stage 1: Exact SKU/Model matching
    processingSteps.push('Stage 1: Attempting exact SKU/Model match');
    matches = this.performExactMatching(competitor, ourProducts);
    
    if (matches.length > 0 && matches[0].confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
      matchingStage = 'exact';
      confidence = matches[0].confidence;
      processingSteps.push(`✓ Exact match found with ${(confidence * 100).toFixed(1)}% confidence`);
      return this.createResult(competitor, matches, matchingStage, confidence, processingSteps);
    }
    processingSteps.push('✗ No high-confidence exact match found');

    // Stage 2: Fuzzy matching
    processingSteps.push('Stage 2: Attempting fuzzy matching');
    matches = this.performFuzzyMatching(competitor, ourProducts);
    
    if (matches.length > 0 && matches[0].confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
      matchingStage = 'fuzzy';
      confidence = matches[0].confidence;
      processingSteps.push(`✓ Fuzzy match found with ${(confidence * 100).toFixed(1)}% confidence`);
      return this.createResult(competitor, matches, matchingStage, confidence, processingSteps);
    }
    processingSteps.push('✗ No high-confidence fuzzy match found');

    // Stage 3: Specification-based matching
    processingSteps.push('Stage 3: Attempting specification-based matching');
    matches = this.performSpecificationMatching(competitor, ourProducts);
    
    if (matches.length > 0 && matches[0].confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
      matchingStage = 'specification';
      confidence = matches[0].confidence;
      processingSteps.push(`✓ Specification match found with ${(confidence * 100).toFixed(1)}% confidence`);
      return this.createResult(competitor, matches, matchingStage, confidence, processingSteps);
    }
    processingSteps.push('✗ No high-confidence specification match found');

    // Stage 4: AI-enhanced matching (using ChatGPT's HVAC knowledge)
    if (this.openAIClient) {
      processingSteps.push('Stage 4: Attempting AI-enhanced matching using HVAC knowledge');
      const aiResult = await this.performAIEnhancedMatching(competitor, ourProducts);
      
      if (aiResult.matches.length > 0) {
        matchingStage = 'ai_enhanced';
        confidence = aiResult.matches[0].confidence;
        processingSteps.push(`✓ AI enhancement found match with ${(confidence * 100).toFixed(1)}% confidence`);
        return {
          ...this.createResult(competitor, aiResult.matches, matchingStage, confidence, processingSteps),
          aiEnhancement: aiResult.aiEnhancement
        };
      }
      processingSteps.push('✗ AI enhancement could not find a match');
    } else {
      processingSteps.push('⚠️ AI enhancement skipped - OpenAI not configured');
    }

    // Stage 5: Web research enhancement (final fallback)
    processingSteps.push('Stage 5: Attempting web research enhancement as final fallback');
    const webResearchResult = await this.performWebResearch(competitor, ourProducts);
    
    if (webResearchResult.matches.length > 0 && webResearchResult.matches[0].confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
      matchingStage = 'web_research';
      confidence = webResearchResult.matches[0].confidence;
      processingSteps.push(`✓ Web research yielded match with ${(confidence * 100).toFixed(1)}% confidence`);
      return {
        ...this.createResult(competitor, webResearchResult.matches, matchingStage, confidence, processingSteps),
        webResearchData: webResearchResult.researchData
      };
    }
    processingSteps.push('✗ Web research did not improve matching');

    // No matches found
    processingSteps.push('✗ No matches found after all stages');
    return this.createResult(competitor, [], 'failed', 0, processingSteps);
  }

  /**
   * Stage 1: Exact matching
   */
  private performExactMatching(competitor: CompetitorProduct, ourProducts: OurProduct[]): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const ourProduct of ourProducts) {
      // Exact SKU match
      if (competitor.sku.toUpperCase() === ourProduct.sku.toUpperCase()) {
        matches.push({
          ourSku: ourProduct.sku,
          ourProduct,
          confidence: 0.95,
          matchMethod: 'exact_sku',
          reasoning: ['Exact SKU match']
        });
      }
      // Exact model match
      else if (competitor.model && ourProduct.model && 
               competitor.model.toUpperCase() === ourProduct.model.toUpperCase()) {
        matches.push({
          ourSku: ourProduct.sku,
          ourProduct,
          confidence: 0.85,
          matchMethod: 'exact_model',
          reasoning: ['Exact model number match']
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Stage 2: Fuzzy matching
   */
  private performFuzzyMatching(competitor: CompetitorProduct, ourProducts: OurProduct[]): MatchResult[] {
    const matches: MatchResult[] = [];

    for (const ourProduct of ourProducts) {
      const reasoning: string[] = [];
      let totalScore = 0;
      let matchCount = 0;

      // Model fuzzy match
      if (competitor.model && ourProduct.model) {
        const modelSimilarity = this.calculateSimilarity(competitor.model, ourProduct.model);
        if (modelSimilarity > this.FUZZY_MATCH_THRESHOLD) {
          totalScore += modelSimilarity * 0.4;
          matchCount++;
          reasoning.push(`Model ${(modelSimilarity * 100).toFixed(1)}% similar`);
        }
      }

      // SKU fuzzy match
      const skuSimilarity = this.calculateSimilarity(competitor.sku, ourProduct.sku);
      if (skuSimilarity > this.FUZZY_MATCH_THRESHOLD) {
        totalScore += skuSimilarity * 0.3;
        matchCount++;
        reasoning.push(`SKU ${(skuSimilarity * 100).toFixed(1)}% similar`);
      }

      // Description match - skip since OurProduct doesn't have description field

      // Brand/Company match
      if (competitor.company && ourProduct.brand) {
        const brandMatch = this.calculateSimilarity(competitor.company, ourProduct.brand);
        if (brandMatch > 0.8) {
          totalScore += 0.1;
          reasoning.push('Brand match');
        }
      }

      if (matchCount > 0 && totalScore > 0.5) {
        matches.push({
          ourSku: ourProduct.sku,
          ourProduct,
          confidence: Math.min(totalScore, 0.85),
          matchMethod: 'model_fuzzy' as MatchMethod,
          reasoning
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Stage 3: Specification-based matching
   */
  private performSpecificationMatching(competitor: CompetitorProduct, ourProducts: OurProduct[]): MatchResult[] {
    const matches: MatchResult[] = [];

    if (!competitor.specifications || Object.keys(competitor.specifications).length === 0) {
      return matches;
    }

    for (const ourProduct of ourProducts) {
      const reasoning: string[] = [];
      let specMatches = 0;
      let totalSpecs = 0;

      // Compare tonnage
      if (competitor.specifications?.tonnage && ourProduct.tonnage) {
        totalSpecs++;
        const competitorTonnage = this.parseNumericValue(competitor.specifications.tonnage);
        if (competitorTonnage && Math.abs(competitorTonnage - ourProduct.tonnage) / ourProduct.tonnage <= 0.1) {
          specMatches++;
          reasoning.push(`tonnage matches (${competitorTonnage} vs ${ourProduct.tonnage})`);
        }
      }

      // Compare SEER
      if (competitor.specifications?.seer && ourProduct.seer) {
        totalSpecs++;
        const competitorSeer = this.parseNumericValue(competitor.specifications.seer);
        if (competitorSeer && Math.abs(competitorSeer - ourProduct.seer) / ourProduct.seer <= 0.1) {
          specMatches++;
          reasoning.push(`SEER matches (${competitorSeer} vs ${ourProduct.seer})`);
        }
      }

      // Compare AFUE for furnaces
      if (competitor.specifications?.afue && ourProduct.afue) {
        totalSpecs++;
        const competitorAfue = this.parseNumericValue(competitor.specifications.afue);
        if (competitorAfue && Math.abs(competitorAfue - ourProduct.afue) / ourProduct.afue <= 0.05) {
          specMatches++;
          reasoning.push(`AFUE matches (${competitorAfue}% vs ${ourProduct.afue}%)`);
        }
      }

      // Compare HSPF for heat pumps
      if (competitor.specifications?.hspf && ourProduct.hspf) {
        totalSpecs++;
        const competitorHspf = this.parseNumericValue(competitor.specifications.hspf);
        if (competitorHspf && Math.abs(competitorHspf - ourProduct.hspf) / ourProduct.hspf <= 0.1) {
          specMatches++;
          reasoning.push(`HSPF matches (${competitorHspf} vs ${ourProduct.hspf})`);
        }
      }

      // Product type match
      if (competitor.specifications?.product_type && ourProduct.type) {
        const typeMatch = this.calculateSimilarity(
          competitor.specifications.product_type,
          ourProduct.type
        );
        if (typeMatch > 0.8) {
          specMatches++;
          totalSpecs++;
          reasoning.push('Product type match');
        }
      }

      if (totalSpecs > 0 && specMatches >= 2) {
        const confidence = (specMatches / totalSpecs) * 0.7 + 0.1;
        matches.push({
          ourSku: ourProduct.sku,
          ourProduct,
          confidence: Math.min(confidence, 0.75),
          matchMethod: 'specifications' as MatchMethod,
          reasoning
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Stage 4: Web research enhancement
   */
  private async performWebResearch(
    competitor: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<{ matches: MatchResult[], researchData: any }> {
    try {
      // Note: This would need to be implemented differently for main process
      // For now, returning empty result as web research is renderer-side
      logger.warn('sequential-matching', 'Web research not available in main process');
      return { matches: [], researchData: null };
    } catch (error) {
      logger.error('sequential-matching', 'Web research failed', error as Error);
      return { matches: [], researchData: null };
    }
  }

  /**
   * Stage 5: AI-enhanced matching
   */
  private async performAIEnhancedMatching(
    competitor: CompetitorProduct,
    ourProducts: OurProduct[]
  ): Promise<{ matches: MatchResult[], aiEnhancement?: any }> {
    if (!this.openAIClient) {
      return { matches: [] };
    }

    try {
      // Create a context string with competitor and top potential matches
      const potentialMatches = ourProducts.slice(0, 20); // Limit to prevent token overflow
      
      const prompt = `
You are an expert HVAC technician and product specialist with deep knowledge of all major HVAC brands, model numbers, and specifications. Use your extensive HVAC knowledge to find the best match.

COMPETITOR PRODUCT TO MATCH:
SKU: ${competitor.sku}
Model: ${competitor.model || 'Not specified'}
Company: ${competitor.company}
Description: ${competitor.description || 'Not specified'}
Price: ${competitor.price ? `$${competitor.price}` : 'Not specified'}
Specifications: ${JSON.stringify(competitor.specifications || {}, null, 2)}

OUR CATALOG PRODUCTS (potential matches):
${potentialMatches.map((p, i) => `
${i + 1}. SKU: ${p.sku}
   Model: ${p.model}
   Brand: ${p.brand}
   Type: ${p.type}
   Tonnage: ${p.tonnage || 'N/A'}
   SEER: ${p.seer || 'N/A'}
   AFUE: ${p.afue || 'N/A'}
   HSPF: ${p.hspf || 'N/A'}
   Refrigerant: ${p.refrigerant || 'N/A'}
`).join('\n')}

INSTRUCTIONS:
1. Use your HVAC expertise to analyze the competitor product
2. Consider model number patterns, specifications, and brand compatibility
3. Look for equivalent products that serve the same function
4. Account for different naming conventions between manufacturers
5. Consider tonnage, efficiency ratings, and application compatibility
6. Provide confidence based on how certain you are of the match

Return structured JSON in this exact format:
{
  "match_found": true/false,
  "matched_sku": "SKU from our catalog or null",
  "confidence": 0.0-1.0,
  "reasoning": ["specific reason 1", "specific reason 2", "specific reason 3"],
  "enhanced_competitor_data": {
    "identified_specifications": {
      "tonnage": "extracted value",
      "seer": "extracted value",
      "product_type": "identified type"
    },
    "product_category": "heating/cooling/air_handler/etc",
    "key_features": ["feature1", "feature2"]
  }
}
`;

      const response = await this.openAIClient.createChatCompletion({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an HVAC product expert. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{}');

      if (aiResult.match_found && aiResult.matched_sku) {
        const matchedProduct = ourProducts.find(p => p.sku === aiResult.matched_sku);
        
        if (matchedProduct) {
          return {
            matches: [{
              ourSku: matchedProduct.sku,
              ourProduct: matchedProduct,
              confidence: Math.min(aiResult.confidence * 0.8, 0.85), // Cap AI confidence
              matchMethod: 'ai_enhanced',
              reasoning: aiResult.reasoning || ['AI-powered match']
            }],
            aiEnhancement: {
              enhancedData: aiResult.enhanced_competitor_data,
              structuredOutput: aiResult
            }
          };
        }
      }

      return { matches: [], aiEnhancement: aiResult };

    } catch (error) {
      logger.error('sequential-matching', 'AI matching failed', error as Error);
      return { matches: [] };
    }
  }

  /**
   * Helper methods
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    // Use Levenshtein distance
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
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

  private parseNumericValue(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const numeric = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(numeric) ? null : numeric;
    }
    return null;
  }

  private createResult(
    competitor: CompetitorProduct,
    matches: MatchResult[],
    matchingStage: SequentialMatchResult['matchingStage'],
    confidence: number,
    processingSteps: string[]
  ): SequentialMatchResult {
    return {
      competitor,
      matches,
      matchingStage,
      confidence,
      processingSteps
    };
  }
}