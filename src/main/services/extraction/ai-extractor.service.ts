import { OpenAIProductExtractor } from '../../../shared/services/openai-extractor';
import { ContentReaderService } from './content-reader.service';
import { ExtractedProduct, ExtractionResult, ExtractionRequest } from './extraction.types';
import { logger } from '../logger.service';
import * as path from 'path';

export class AIExtractorService {
  private contentReader: ContentReaderService;
  private openaiExtractor?: OpenAIProductExtractor;

  constructor(openaiApiKey?: string) {
    this.contentReader = new ContentReaderService();
    
    if (openaiApiKey) {
      this.openaiExtractor = new OpenAIProductExtractor(openaiApiKey);
      logger.info('ai-extractor', 'Initialized with OpenAI support');
    } else {
      logger.warn('ai-extractor', 'Initialized WITHOUT OpenAI support - will fallback to traditional methods');
    }
  }

  async extractFromFile(request: ExtractionRequest): Promise<ExtractionResult> {
    const startTime = Date.now();
    const fileName = path.basename(request.filePath);
    const fileType = path.extname(request.filePath).toLowerCase();

    logger.info('ai-extractor', 'Starting AI-first extraction', {
      filePath: request.filePath,
      useAI: request.options?.useAI !== false && !!this.openaiExtractor
    });

    try {
      // Step 1: Get raw content from file
      const contentResult = await this.contentReader.getContent(request.filePath);
      
      if (!contentResult.success) {
        return this.createFailureResult(fileName, fileType, startTime, contentResult.error || 'Failed to read file content');
      }

      // Step 2: Use AI FIRST if available
      if (this.openaiExtractor && request.options?.useAI !== false) {
        const aiResult = await this.extractWithAI(contentResult.content, fileName, contentResult.contentType);
        
        if (aiResult.success && aiResult.products.length > 0) {
          const processingTime = Date.now() - startTime;
          
          logger.info('ai-extractor', 'AI extraction successful', {
            productsFound: aiResult.products.length,
            averageConfidence: this.calculateAverageConfidence(aiResult.products),
            processingTime
          });

          return {
            success: true,
            products: aiResult.products,
            source: request.filePath,
            extractionMethod: 'ai',
            processingTime,
            metadata: {
              fileName,
              fileType,
              totalItemsFound: aiResult.products.length,
              averageConfidence: this.calculateAverageConfidence(aiResult.products)
            }
          };
        }
      }

      // Step 3: Fallback to basic extraction if AI fails or unavailable
      logger.info('ai-extractor', 'Falling back to traditional extraction');
      const fallbackResult = await this.extractWithFallback(contentResult.content, fileName);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: fallbackResult.length > 0,
        products: fallbackResult,
        source: request.filePath,
        extractionMethod: 'traditional',
        processingTime,
        metadata: {
          fileName,
          fileType,
          totalItemsFound: fallbackResult.length,
          averageConfidence: this.calculateAverageConfidence(fallbackResult)
        }
      };

    } catch (error) {
      logger.error('ai-extractor', 'Extraction failed', error instanceof Error ? error : new Error(String(error)));
      return this.createFailureResult(fileName, fileType, startTime, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async extractWithAI(content: string, fileName: string, contentType: string): Promise<{ success: boolean; products: ExtractedProduct[] }> {
    if (!this.openaiExtractor) {
      return { success: false, products: [] };
    }

    try {
      // Create enhanced prompt for AI
      const prompt = this.createAIPrompt(content, fileName, contentType);
      
      logger.debug('ai-extractor', 'Sending to OpenAI for extraction', {
        contentLength: content.length,
        contentType,
        promptLength: prompt.length
      });

      // Use OpenAI to extract structured data
      const aiResults = await this.openaiExtractor.extractProducts(prompt);

      if (!aiResults || !aiResults.products || !Array.isArray(aiResults.products)) {
        logger.warn('ai-extractor', 'AI returned invalid format', aiResults);
        return { success: false, products: [] };
      }

      // Convert AI results to our standardized format
      const extractedProducts: ExtractedProduct[] = aiResults.products.map(product => ({
        sku: product.sku || product.model || 'Unknown',
        brand: product.brand || product.manufacturer || 'Unknown',
        price: this.parsePrice(product.price),
        description: product.description || '',
        confidence: 0.9, // High confidence for AI extraction
        model: product.model || product.sku,
        category: product.category,
        capacity: product.specifications?.capacity ? {
          value: product.specifications.capacity.value,
          unit: product.specifications.capacity.unit
        } : undefined,
        efficiency: product.specifications?.efficiency?.map(eff => ({
          type: eff.type as 'SEER' | 'AFUE' | 'HSPF',
          value: eff.value
        })),
        refrigerant: product.specifications?.refrigerant,
        specifications: product.specifications
      }));

      return {
        success: extractedProducts.length > 0,
        products: this.deduplicateProducts(extractedProducts)
      };

    } catch (error) {
      logger.error('ai-extractor', 'OpenAI extraction failed', error instanceof Error ? error : new Error(String(error)));
      return { success: false, products: [] };
    }
  }

  private async extractWithFallback(content: string, fileName: string): Promise<ExtractedProduct[]> {
    logger.debug('ai-extractor', 'Using fallback extraction patterns');
    
    // Very basic fallback - just find SKU-like patterns
    const products: ExtractedProduct[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Look for SKU-like patterns
      const skuMatch = trimmed.match(/\b([A-Z][A-Z0-9-]{3,})\b/);
      if (skuMatch) {
        // Try to find price on same line
        const priceMatch = trimmed.match(/\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
        
        products.push({
          sku: skuMatch[1],
          brand: 'Unknown',
          description: trimmed,
          confidence: 0.3, // Low confidence for pattern matching
          price: priceMatch ? this.parsePrice(priceMatch[1]) : undefined
        });
      }
    }

    return this.deduplicateProducts(products);
  }

  private createAIPrompt(content: string, fileName: string, contentType: string): string {
    return `You are an HVAC product data extraction specialist. Extract ALL HVAC products from this ${contentType} content.

Source: ${fileName}
Content Type: ${contentType}

CRITICAL REQUIREMENTS:
1. Extract EVERY product/SKU you can find
2. Return data in this EXACT JSON format:
{
  "products": [
    {
      "sku": "product SKU/model number",
      "brand": "manufacturer/brand name",
      "price": "numeric price value only",
      "description": "product description",
      "model": "model number if different from SKU",
      "category": "product category if identifiable",
      "specifications": {
        "capacity": {"value": number, "unit": "TON|BTU|CFM"},
        "efficiency": [{"type": "SEER|AFUE|HSPF", "value": number}],
        "refrigerant": "refrigerant type if mentioned"
      }
    }
  ]
}

3. For prices: extract numeric values only (remove $, commas)
4. If brand/manufacturer is unclear, use "Unknown"
5. Include ANY HVAC-related products: units, parts, accessories, etc.
6. Be thorough - don't miss any products

Content to analyze:
${content}

Return ONLY the JSON response, no other text.`;
  }

  private parsePrice(priceValue: any): number | undefined {
    if (typeof priceValue === 'number') return priceValue;
    if (!priceValue) return undefined;
    
    const priceStr = String(priceValue).replace(/[$,]/g, '');
    const parsed = parseFloat(priceStr);
    return isNaN(parsed) ? undefined : parsed;
  }

  private deduplicateProducts(products: ExtractedProduct[]): ExtractedProduct[] {
    const seen = new Set<string>();
    return products.filter(product => {
      const key = `${product.sku}-${product.brand}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private calculateAverageConfidence(products: ExtractedProduct[]): number {
    if (products.length === 0) return 0;
    const sum = products.reduce((acc, product) => acc + product.confidence, 0);
    return sum / products.length;
  }

  private createFailureResult(fileName: string, fileType: string, startTime: number, error: string): ExtractionResult {
    return {
      success: false,
      products: [],
      source: fileName,
      extractionMethod: 'ai',
      processingTime: Date.now() - startTime,
      error,
      metadata: {
        fileName,
        fileType,
        totalItemsFound: 0,
        averageConfidence: 0
      }
    };
  }
}