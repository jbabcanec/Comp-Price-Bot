import { FileProcessorService, ProcessingResult } from './fileProcessor.service';
import { OpenAIProductExtractor } from '@shared/services/openai-extractor';
import { ExtractedData } from '@shared/types/product.types';
import { logger } from './logger.service';
import { createWorker } from 'tesseract.js';

/**
 * Supercharged File Processor with AI/ML fallbacks
 * Uses composition pattern to avoid inheritance issues
 */
export class SuperchargedFileProcessor {
  private baseProcessor: FileProcessorService;
  private openaiExtractor?: OpenAIProductExtractor;
  private useAIFallbacks: boolean = true;

  constructor(openaiApiKey?: string) {
    this.baseProcessor = new FileProcessorService(openaiApiKey);
    
    if (openaiApiKey) {
      this.openaiExtractor = new OpenAIProductExtractor(openaiApiKey);
      logger.info('supercharged-processor', 'Initialized with full AI capabilities');
    } else {
      logger.info('supercharged-processor', 'Initialized with traditional processing only');
    }
  }

  /**
   * Process file with multiple AI/ML fallback strategies
   */
  async processFileWithFallbacks(filePath: string): Promise<ProcessingResult> {
    logger.info('supercharged-processor', 'Starting supercharged processing', { filePath });
    
    const startTime = Date.now();
    let bestResult: ProcessingResult;
    
    try {
      // Strategy 1: Base processor (with existing OCR and traditional parsing)
      logger.debug('supercharged-processor', 'Trying base processor');
      bestResult = await this.baseProcessor.processFile(filePath, true); // Force use OpenAI if available
      
      // Strategy 2: Enhanced AI processing if base didn't find much
      if (this.shouldTryAIFallback(bestResult)) {
        logger.debug('supercharged-processor', 'Base result insufficient, trying AI fallback');
        const aiResult = await this.processWithAIFallback(filePath);
        
        if (this.isBetterResult(aiResult, bestResult)) {
          bestResult = aiResult;
          logger.info('supercharged-processor', 'AI fallback produced better results');
        }
      }
      
      // Strategy 3: Multi-confidence processing
      if (this.shouldTryMultiConfidence(bestResult)) {
        logger.debug('supercharged-processor', 'Trying multi-confidence extraction');
        const multiResult = await this.processWithMultiConfidence(filePath);
        
        if (this.isBetterResult(multiResult, bestResult)) {
          bestResult = multiResult;
          logger.info('supercharged-processor', 'Multi-confidence produced better results');
        }
      }
      
      // Strategy 4: Enhanced OCR for images
      if (this.isImageFile(filePath) && this.shouldTryEnhancedOCR(bestResult)) {
        logger.debug('supercharged-processor', 'Trying enhanced OCR for image');
        const ocrResult = await this.processWithEnhancedOCR(filePath);
        
        if (this.isBetterResult(ocrResult, bestResult)) {
          bestResult = ocrResult;
          logger.info('supercharged-processor', 'Enhanced OCR produced better results');
        }
      }

    } catch (error) {
      logger.error('supercharged-processor', 'All processing strategies failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        data: [],
        fileName: filePath.split('/').pop() || 'unknown',
        fileType: this.getFileExtension(filePath),
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }

    const processingTime = Date.now() - startTime;
    logger.info('supercharged-processor', 'Supercharged processing complete', {
      success: bestResult.success,
      itemsFound: bestResult.data.length,
      processingTime,
      strategy: bestResult.extractionMethod || 'combined'
    });

    return {
      ...bestResult,
      processingTime
    };
  }

  /**
   * AI fallback processing for difficult files
   */
  private async processWithAIFallback(filePath: string): Promise<ProcessingResult> {
    if (!this.openaiExtractor) {
      throw new Error('AI fallback not available');
    }

    try {
      // First get any text content we can from the file
      const baseResult = await this.baseProcessor.processFile(filePath, false); // Don't use OpenAI yet
      
      if (!baseResult.success) {
        throw new Error('Could not extract base content for AI processing');
      }

      // Create enhanced prompt for AI
      const enhancedText = this.createAIPrompt(baseResult.data, filePath);
      
      // Use AI to extract structured data
      const aiResults = await this.openaiExtractor.extractProducts(enhancedText);
      
      // Convert AI results to our format
      const extractedData: ExtractedData[] = aiResults.products.map(product => ({
        sku: product.sku,
        company: product.brand || product.manufacturer || 'Unknown',
        price: product.price?.value,
        model: product.model || product.sku,
        description: product.description,
        source: 'AI Fallback',
        confidence: 0.8,
        tonnage: product.specifications?.capacity?.unit === 'TON' ? product.specifications.capacity.value : undefined,
        seer: product.specifications?.efficiency?.find((e: any) => e.type === 'SEER')?.value,
        afue: product.specifications?.efficiency?.find((e: any) => e.type === 'AFUE')?.value,
        hspf: product.specifications?.efficiency?.find((e: any) => e.type === 'HSPF')?.value,
        refrigerant: product.specifications?.refrigerant
      }));

      return {
        success: extractedData.length > 0,
        data: extractedData,
        fileName: filePath.split('/').pop() || 'unknown',
        fileType: this.getFileExtension(filePath),
        processingTime: 0, // Will be set by caller
        extractionMethod: 'hybrid'
      };

    } catch (error) {
      logger.warn('supercharged-processor', 'AI fallback failed', error);
      throw error;
    }
  }

  /**
   * Multi-confidence processing - try different confidence thresholds
   */
  private async processWithMultiConfidence(filePath: string): Promise<ProcessingResult> {
    const allResults: ExtractedData[] = [];
    const confidenceLevels = [0.9, 0.7, 0.5, 0.3];

    for (const threshold of confidenceLevels) {
      try {
        // Process with current confidence threshold
        const result: ProcessingResult = await this.baseProcessor.processFile(filePath, false);
        
        if (result.success) {
          // Filter results by confidence and add unique items
          const filteredResults = result.data.filter(item => 
            (item.confidence || 0.5) >= threshold
          );
          
          for (const item of filteredResults) {
            if (!allResults.some(existing => 
              existing.sku === item.sku && existing.company === item.company
            )) {
              allResults.push({
                ...item,
                confidence: (item.confidence || 0.5) * (threshold / 0.9), // Adjust confidence based on threshold
                source: `Multi-Confidence (${threshold})`
              });
            }
          }
        }
      } catch (error) {
        logger.debug('supercharged-processor', `Multi-confidence failed at threshold ${threshold}`, error);
      }
    }

    return {
      success: allResults.length > 0,
      data: allResults.sort((a, b) => (b.confidence || 0) - (a.confidence || 0)),
      fileName: filePath.split('/').pop() || 'unknown',
      fileType: this.getFileExtension(filePath),
      processingTime: 0,
      extractionMethod: 'traditional'
    };
  }

  /**
   * Enhanced OCR processing for images
   */
  private async processWithEnhancedOCR(filePath: string): Promise<ProcessingResult> {
    try {
      logger.debug('supercharged-processor', 'Starting enhanced OCR processing');
      
      // Use Tesseract with enhanced settings
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            logger.debug('supercharged-processor', `OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });

      // Configure for HVAC document recognition
      await worker.setParameters({
        tessedit_page_seg_mode: '6', // Uniform block of text
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.,$/: ()',
        preserve_interword_spaces: '1'
      });

      const { data: { text } } = await worker.recognize(filePath);
      await worker.terminate();

      logger.debug('supercharged-processor', 'OCR text extracted', { 
        textLength: text.length,
        preview: text.substring(0, 200) 
      });

      // Process OCR text using base processor's text extraction
      const extractedData = await this.extractDataFromText(text, 'Enhanced OCR');

      return {
        success: extractedData.length > 0,
        data: extractedData.map(item => ({
          ...item,
          confidence: (item.confidence || 0.5) * 1.1 // Slight boost for enhanced OCR
        })),
        fileName: filePath.split('/').pop() || 'unknown',
        fileType: this.getFileExtension(filePath),
        processingTime: 0,
        extractionMethod: 'traditional'
      };

    } catch (error) {
      logger.error('supercharged-processor', 'Enhanced OCR failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Extract data from text using base processor patterns
   */
  private async extractDataFromText(text: string, source: string): Promise<ExtractedData[]> {
    // Create a temporary result to extract from text
    const tempResult = { success: true, data: [] as ExtractedData[] };
    
    // Use regex patterns to extract HVAC product information
    const patterns = [
      // SKU/Model with price: ABC123 $1,234.50
      /([A-Z][A-Z0-9-]{3,})\s+\$?([\d,]+(?:\.\d{2})?)/gi,
      // Model number patterns: More specific for HVAC
      /(?:Model|SKU|Part#?)\s*:?\s*([A-Z0-9-]{4,})/gi,
      // HVAC unit patterns with tonnage
      /([\d.]+)\s*TON\s+([A-Z0-9-]+)/gi
    ];

    const results: ExtractedData[] = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) {
          results.push({
            sku: match[1],
            company: 'Unknown',
            price: match[2] ? parseFloat(match[2].replace(/,/g, '')) : undefined,
            source: source,
            confidence: 0.7,
            rawData: match[0],
            extractionMethod: 'pattern-matching'
          });
        }
      }
    });

    return this.deduplicateResults(results);
  }

  // Helper methods

  private shouldTryAIFallback(result: ProcessingResult): boolean {
    // Try AI fallback if we found few items or low confidence
    if (!result.success) return true;
    if (result.data.length === 0) return true;
    if (result.data.length < 3) return true;
    
    const avgConfidence = result.data.reduce((sum, item) => sum + (item.confidence || 0.5), 0) / result.data.length;
    return avgConfidence < 0.6;
  }

  private shouldTryMultiConfidence(result: ProcessingResult): boolean {
    // Try multi-confidence if we have some results but not many
    return result.success && result.data.length > 0 && result.data.length < 10;
  }

  private shouldTryEnhancedOCR(result: ProcessingResult): boolean {
    // Try enhanced OCR if we have few results from an image
    return result.data.length < 5;
  }

  private isBetterResult(newResult: ProcessingResult, currentBest: ProcessingResult): boolean {
    if (!newResult.success) return false;
    if (!currentBest.success) return true;
    
    // Prefer results with more items
    if (newResult.data.length > currentBest.data.length) return true;
    if (newResult.data.length < currentBest.data.length) return false;
    
    // If same count, prefer higher average confidence
    const newAvgConfidence = this.calculateAverageConfidence(newResult.data);
    const currentAvgConfidence = this.calculateAverageConfidence(currentBest.data);
    
    return newAvgConfidence > currentAvgConfidence;
  }

  private calculateAverageConfidence(results: ExtractedData[]): number {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, item) => acc + (item.confidence || 0.5), 0);
    return sum / results.length;
  }

  private isImageFile(filePath: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
    const ext = this.getFileExtension(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  private getFileExtension(filePath: string): string {
    return filePath.substring(filePath.lastIndexOf('.'));
  }

  private createAIPrompt(baseData: ExtractedData[], filePath: string): string {
    const fileName = filePath.split('/').pop() || 'unknown';
    
    let prompt = `Analyze this HVAC product data and extract structured information:\n`;
    prompt += `Source file: ${fileName}\n\n`;
    
    if (baseData.length > 0) {
      prompt += `Previously extracted data:\n`;
      baseData.forEach((item, index) => {
        prompt += `${index + 1}. SKU: ${item.sku}, Company: ${item.company}, Price: ${item.price || 'N/A'}\n`;
        if (item.description) prompt += `   Description: ${item.description}\n`;
      });
      prompt += `\nPlease enhance this data and find any additional HVAC products.\n`;
    } else {
      prompt += `No structured data was found. Please analyze the raw content and extract any HVAC product information including SKUs, models, prices, and specifications.\n`;
    }
    
    return prompt;
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