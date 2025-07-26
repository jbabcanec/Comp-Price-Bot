import { FileProcessorService, ProcessingResult } from './fileProcessor.service';
import { OpenAIProductExtractor } from '@shared/services/openai-extractor';
import { UniversalSpecDetector } from '@shared/utils/universalSpecDetector';
import { ExtractedData } from '@shared/types/product.types';
import { logger } from './logger.service';
import * as sharp from 'sharp';
import { createWorker } from 'tesseract.js';

/**
 * Enhanced AI Processor with multiple fallback strategies
 * Supercharged version with ML/AI capabilities for robust data extraction
 */
export class EnhancedAIProcessor extends FileProcessorService {
  private enhancedOpenaiExtractor?: OpenAIProductExtractor;
  private confidenceThreshold: number = 0.6;
  private useAdvancedOCR: boolean = true;
  private useImagePreprocessing: boolean = true;
  private useMultipassExtraction: boolean = true;

  constructor(openaiApiKey?: string, options?: {
    confidenceThreshold?: number;
    useAdvancedOCR?: boolean;
    useImagePreprocessing?: boolean;
    useMultipassExtraction?: boolean;
  }) {
    super(openaiApiKey);
    
    if (openaiApiKey) {
      this.enhancedOpenaiExtractor = new OpenAIProductExtractor(openaiApiKey);
    }
    
    if (options) {
      this.confidenceThreshold = options.confidenceThreshold ?? 0.6;
      this.useAdvancedOCR = options.useAdvancedOCR ?? true;
      this.useImagePreprocessing = options.useImagePreprocessing ?? true;
      this.useMultipassExtraction = options.useMultipassExtraction ?? true;
    }
  }

  /**
   * Supercharged file processing with multiple AI/ML fallbacks
   */
  async processFileWithAIFallbacks(filePath: string): Promise<ProcessingResult> {
    logger.info('enhanced-ai', 'Starting enhanced AI processing', { 
      filePath,
      useAdvancedOCR: this.useAdvancedOCR,
      useMultipassExtraction: this.useMultipassExtraction
    });

    const startTime = Date.now();
    const strategies: Array<() => Promise<ExtractedData[]>> = [];

    // Strategy 1: Traditional processing (baseline)
    strategies.push(async () => {
      logger.debug('enhanced-ai', 'Trying traditional processing');
      const result = await super.processFile(filePath);
      return result.data;
    });

    // Strategy 2: Enhanced OCR with image preprocessing
    if (this.useAdvancedOCR && this.isImageFile(filePath)) {
      strategies.push(async () => {
        logger.debug('enhanced-ai', 'Trying enhanced OCR processing');
        return await this.processImageWithEnhancedOCR(filePath);
      });
    }

    // Strategy 3: AI-powered text extraction
    if (this.enhancedOpenaiExtractor) {
      strategies.push(async () => {
        logger.debug('enhanced-ai', 'Trying AI-powered extraction');
        return await this.processWithAI(filePath);
      });
    }

    // Strategy 4: Multi-pass extraction with different confidence levels
    if (this.useMultipassExtraction) {
      strategies.push(async () => {
        logger.debug('enhanced-ai', 'Trying multi-pass extraction');
        return await this.multiPassExtraction(filePath);
      });
    }

    // Execute strategies with intelligent fallback
    let bestResult: ExtractedData[] = [];
    let bestConfidence = 0;
    let successfulStrategy = 'none';

    for (let i = 0; i < strategies.length; i++) {
      try {
        const strategyName = ['traditional', 'enhanced-ocr', 'ai-powered', 'multi-pass'][i];
        logger.debug('enhanced-ai', `Executing strategy: ${strategyName}`);
        
        const result = await strategies[i]();
        const avgConfidence = this.calculateAverageConfidence(result);
        
        logger.info('enhanced-ai', `Strategy ${strategyName} completed`, {
          itemsFound: result.length,
          avgConfidence: avgConfidence.toFixed(3)
        });

        // Use the best result based on confidence and item count
        if (this.isBetterResult(result, avgConfidence, bestResult, bestConfidence)) {
          bestResult = result;
          bestConfidence = avgConfidence;
          successfulStrategy = strategyName;
        }

        // If we have high confidence results, we can stop early
        if (avgConfidence > 0.9 && result.length > 0) {
          logger.info('enhanced-ai', `High confidence result found with ${strategyName}, stopping early`);
          break;
        }
      } catch (error) {
        logger.warn('enhanced-ai', `Strategy ${i} failed`, error);
        continue;
      }
    }

    // Enhance the best result with additional AI processing
    if (bestResult.length > 0 && this.enhancedOpenaiExtractor) {
      try {
        bestResult = await this.enhanceResultsWithAI(bestResult, filePath);
        logger.info('enhanced-ai', 'Results enhanced with AI post-processing');
      } catch (error) {
        logger.warn('enhanced-ai', 'AI enhancement failed, using original results', error);
      }
    }

    const processingTime = Date.now() - startTime;
    const fileName = filePath.split('/').pop() || 'unknown';

    logger.info('enhanced-ai', 'Enhanced AI processing complete', {
      strategy: successfulStrategy,
      itemsFound: bestResult.length,
      confidence: bestConfidence.toFixed(3),
      processingTime
    });

    return {
      success: bestResult.length > 0,
      data: bestResult,
      fileName,
      fileType: this.getFileExtension(filePath),
      processingTime,
      extractionMethod: successfulStrategy as any,
      openaiResults: undefined // Would be populated if AI was used
    };
  }

  /**
   * Enhanced OCR with image preprocessing
   */
  private async processImageWithEnhancedOCR(filePath: string): Promise<ExtractedData[]> {
    if (!this.useImagePreprocessing) {
      // Use the parent class's image processing method 
      const fs = await import('fs/promises');
      const imageBuffer = await fs.readFile(filePath);
      return await this.processImage(imageBuffer, 'Enhanced OCR Fallback');
    }

    try {
      // Read and preprocess the image
      const imageBuffer = await this.preprocessImage(filePath);
      
      // Create OCR worker with enhanced settings
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug('enhanced-ai', `OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      await worker.setParameters({
        tessedit_page_seg_mode: '6', // Uniform block of text
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.,$/: ',
        preserve_interword_spaces: '1'
      });

      const { data: { text } } = await worker.recognize(imageBuffer);
      await worker.terminate();

      // Extract data from OCR text
      const extractedData = this.extractFromText(text, 'Enhanced OCR');
      
      // Apply OCR-specific confidence boost
      return extractedData.map(item => ({
        ...item,
        confidence: (item.confidence || 0.5) * 1.2 // Boost OCR confidence
      }));

    } catch (error) {
      logger.error('enhanced-ai', 'Enhanced OCR failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(filePath: string): Promise<Buffer> {
    try {
      const image = (await import('sharp')).default(filePath);
      const metadata = await image.metadata();
      
      logger.debug('enhanced-ai', 'Preprocessing image', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      });

      // Apply preprocessing pipeline
      return await image
        .resize({ width: Math.min(metadata.width || 2000, 2000), withoutEnlargement: true })
        .greyscale()
        .normalize()
        .sharpen()
        .threshold(128)
        .toBuffer();
        
    } catch (error) {
      logger.warn('enhanced-ai', 'Image preprocessing failed, using original', error);
      // Fallback to original image
      const fs = await import('fs/promises');
      return await fs.readFile(filePath);
    }
  }

  /**
   * AI-powered text extraction using OpenAI
   */
  private async processWithAI(filePath: string): Promise<ExtractedData[]> {
    if (!this.enhancedOpenaiExtractor) {
      throw new Error('OpenAI extractor not available');
    }

    // First get the raw text content
    const baseResult = await super.processFile(filePath);
    if (!baseResult.success || baseResult.data.length === 0) {
      throw new Error('No base content to process with AI');
    }

    // Create comprehensive text for AI analysis
    const combinedText = this.createEnhancedTextForAI(baseResult.data, filePath);
    
    // Use AI to extract structured data
    const aiResults = await this.enhancedOpenaiExtractor.extractProducts(combinedText);
    
    // Convert AI results to ExtractedData format
    return aiResults.products.map(product => ({
      sku: product.sku,
      company: product.brand || product.manufacturer || 'Unknown',
      price: product.price?.value,
      model: product.model || product.sku,
      description: product.description,
      source: 'AI Enhanced',
      confidence: 0.85, // High confidence for AI results
      // HVAC-specific fields
      tonnage: product.specifications?.capacity?.unit === 'TON' ? product.specifications.capacity.value : undefined,
      seer: product.specifications?.efficiency?.find((e: any) => e.type === 'SEER')?.value,
      afue: product.specifications?.efficiency?.find((e: any) => e.type === 'AFUE')?.value,
      hspf: product.specifications?.efficiency?.find((e: any) => e.type === 'HSPF')?.value,
      refrigerant: product.specifications?.refrigerant
    }));
  }

  /**
   * Multi-pass extraction with different confidence levels
   */
  private async multiPassExtraction(filePath: string): Promise<ExtractedData[]> {
    const allResults: ExtractedData[] = [];
    const confidenceLevels = [0.8, 0.6, 0.4, 0.2];
    
    for (const threshold of confidenceLevels) {
      try {
        // Temporarily adjust confidence threshold
        const originalThreshold = this.confidenceThreshold;
        this.confidenceThreshold = threshold;
        
        const result = await super.processFile(filePath);
        
        // Restore original threshold
        this.confidenceThreshold = originalThreshold;
        
        if (result.success) {
          // Add unique results not already found
          for (const item of result.data) {
            if (!allResults.some(existing => 
              existing.sku === item.sku && existing.company === item.company
            )) {
              allResults.push({
                ...item,
                confidence: (item.confidence || 0.5) * (threshold / 0.8) // Adjust confidence based on pass
              });
            }
          }
        }
      } catch (error) {
        logger.debug('enhanced-ai', `Multi-pass extraction failed at threshold ${threshold}`, error);
      }
    }
    
    // Sort by confidence and return
    return allResults.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Enhance results with additional AI processing
   */
  private async enhanceResultsWithAI(results: ExtractedData[], filePath: string): Promise<ExtractedData[]> {
    if (!this.enhancedOpenaiExtractor || results.length === 0) {
      return results;
    }

    try {
      // Create enrichment prompt for existing results
      const enrichmentText = this.createEnrichmentPrompt(results, filePath);
      const aiEnhancement = await this.enhancedOpenaiExtractor.extractProducts(enrichmentText);
      
      // Merge AI enhancements with original results
      return this.mergeAIEnhancements(results, aiEnhancement.products);
    } catch (error) {
      logger.warn('enhanced-ai', 'AI enhancement failed', error);
      return results;
    }
  }

  // Helper methods

  private calculateAverageConfidence(results: ExtractedData[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, item) => acc + (item.confidence || 0.5), 0);
    return sum / results.length;
  }

  private isBetterResult(
    newResult: ExtractedData[], 
    newConfidence: number, 
    currentBest: ExtractedData[], 
    currentConfidence: number
  ): boolean {
    // Prefer results with more items if confidence is similar
    if (Math.abs(newConfidence - currentConfidence) < 0.1) {
      return newResult.length > currentBest.length;
    }
    // Otherwise prefer higher confidence
    return newConfidence > currentConfidence;
  }

  private isImageFile(filePath: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
    const ext = this.getFileExtension(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  private getFileExtension(filePath: string): string {
    return filePath.substring(filePath.lastIndexOf('.'));
  }

  private createEnhancedTextForAI(data: ExtractedData[], filePath: string): string {
    const fileName = filePath.split('/').pop() || 'unknown';
    
    let text = `HVAC Product Data Analysis Request\n`;
    text += `Source: ${fileName}\n`;
    text += `Items found: ${data.length}\n\n`;
    
    data.forEach((item, index) => {
      text += `Item ${index + 1}:\n`;
      text += `SKU: ${item.sku || 'Unknown'}\n`;
      text += `Company: ${item.company || 'Unknown'}\n`;
      text += `Model: ${item.model || 'Unknown'}\n`;
      text += `Price: ${item.price ? '$' + item.price : 'Unknown'}\n`;
      text += `Description: ${item.description || 'Unknown'}\n`;
      text += `Raw Data: ${item.rawData || 'Unknown'}\n\n`;
    });
    
    return text;
  }

  private createEnrichmentPrompt(results: ExtractedData[], filePath: string): string {
    return `Please enhance and validate the following HVAC product data:\n\n${JSON.stringify(results, null, 2)}`;
  }

  private mergeAIEnhancements(original: ExtractedData[], aiEnhanced: any[]): ExtractedData[] {
    // Simple merge strategy - prefer AI data for missing fields
    return original.map(originalItem => {
      const aiMatch = aiEnhanced.find(ai => 
        ai.sku === originalItem.sku || ai.model === originalItem.model
      );
      
      if (aiMatch) {
        return {
          ...originalItem,
          // Enhance with AI data where original is missing
          company: originalItem.company || aiMatch.brand || aiMatch.manufacturer,
          description: originalItem.description || aiMatch.description,
          tonnage: originalItem.tonnage || (aiMatch.specifications?.capacity?.unit === 'TON' ? aiMatch.specifications.capacity.value : undefined),
          seer: originalItem.seer || aiMatch.specifications?.efficiency?.find((e: any) => e.type === 'SEER')?.value,
          confidence: Math.max(originalItem.confidence || 0.5, 0.8) // Boost confidence for AI-enhanced items
        };
      }
      
      return originalItem;
    });
  }

  private mapAITypeToProductType(aiType: string): string {
    const typeMap: Record<string, string> = {
      'air_conditioner': 'AC',
      'heat_pump': 'Heat Pump',
      'furnace': 'Furnace',
      'air_handler': 'Air Handler',
      'rooftop_unit': 'AC',
      'chiller': 'AC',
      'boiler': 'Furnace'
    };
    
    return typeMap[aiType.toLowerCase()] || 'AC';
  }

  /**
   * Extract from text with enhanced patterns (reuse parent method)
   */
  public extractFromText(text: string, source: string): ExtractedData[] {
    // Use the parent class implementation but with enhanced processing
    const baseResults = super['extractFromText'](text, source);
    
    // Apply additional pattern matching for edge cases
    const enhancedResults = this.applyEnhancedPatterns(text, source);
    
    // Merge and deduplicate
    const combined = [...baseResults, ...enhancedResults];
    return this.deduplicateResults(combined);
  }

  private applyEnhancedPatterns(text: string, source: string): ExtractedData[] {
    const results: ExtractedData[] = [];
    
    // Additional patterns for edge cases
    const enhancedPatterns = [
      // Pattern for model numbers with prices in parentheses
      /([A-Z][A-Z0-9-]{4,})\s*\(([\d,]+(?:\.\d{2})?)\)/gi,
      // Pattern for manufacturer part numbers
      /(?:P\/N|PN|Part#?)\s*:?\s*([A-Z0-9-]{5,})/gi,
      // Pattern for HVAC unit descriptions with tonnage
      /([\d.]+)\s*TON\s+([A-Z0-9-]+)/gi
    ];
    
    enhancedPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          results.push({
            sku: match[1],
            company: 'Unknown',
            price: match[2] ? parseFloat(match[2].replace(/,/g, '')) : undefined,
            source: `${source} - Enhanced Pattern`,
            confidence: 0.7,
            rawData: match[0]
          });
        }
      }
    });
    
    return results;
  }

  private deduplicateResults(results: ExtractedData[]): ExtractedData[] {
    const seen = new Set<string>();
    return results.filter(item => {
      const key = `${item.sku}-${item.company}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}