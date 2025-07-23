import { AdvancedEmailProcessor, EmailDeconstructionResult } from './emailProcessor.service';
import { EmailComponentRouter, ProcessedEmailResult } from './emailComponentRouter.service';
import { EmailImageExtractor, ImageProcessingResult } from './emailImageExtractor.service';
import { EmailAttachmentProcessor, AttachmentProcessingResult } from './emailAttachmentProcessor.service';
import { EmailContentCorrelator, CorrelationAnalysis } from './emailContentCorrelator.service';
import { EmailCacheService } from './emailCacheService.service';
import { ExtractedData } from '@shared/types/product.types';

export interface UnifiedEmailProcessingResult {
  // Original email data
  originalEmail: EmailDeconstructionResult;
  
  // Processed components
  componentResults: ProcessedEmailResult;
  imageResults: ImageProcessingResult;
  attachmentResults: AttachmentProcessingResult;
  correlationAnalysis: CorrelationAnalysis;
  
  // Final unified results
  finalResults: ExtractedData[]; // Merged and deduplicated
  
  // Comprehensive processing metadata
  processingMetadata: {
    totalProcessingTime: number;
    componentsProcessed: {
      textComponents: number;
      imageComponents: number;
      attachmentComponents: number;
      embeddedImages: number;
    };
    dataExtractionStats: {
      totalItemsExtracted: number;
      uniqueItemsAfterDeduplication: number;
      averageConfidence: number;
      confidenceDistribution: {
        excellent: number; // 0.9+
        good: number;      // 0.7-0.9
        fair: number;      // 0.5-0.7
        poor: number;      // 0.3-0.5
        none: number;      // <0.3
      };
    };
    sourceBreakdown: {
      textOnly: number;
      imageOnly: number;
      attachmentOnly: number;
      multipleSources: number;
    };
    processingIssues: {
      failedComponents: string[];
      warnings: string[];
      errors: string[];
    };
  };
  
  // Audit trail
  auditTrail: {
    [itemId: string]: {
      sku: string;
      sources: string[];
      correlationRules: string[];
      confidenceHistory: Array<{
        stage: string;
        confidence: number;
        reason: string;
      }>;
      processingPath: string[];
    };
  };
}

export class UnifiedEmailProcessor {
  private emailProcessor: AdvancedEmailProcessor;
  private componentRouter: EmailComponentRouter;
  private imageExtractor: EmailImageExtractor;
  private attachmentProcessor: EmailAttachmentProcessor;
  private contentCorrelator: EmailContentCorrelator;
  private cacheService: EmailCacheService;

  constructor(cacheConfig?: any) {
    this.emailProcessor = new AdvancedEmailProcessor();
    this.componentRouter = new EmailComponentRouter();
    this.imageExtractor = new EmailImageExtractor();
    this.attachmentProcessor = new EmailAttachmentProcessor();
    this.contentCorrelator = new EmailContentCorrelator();
    this.cacheService = new EmailCacheService(cacheConfig);
  }

  /**
   * Main entry point - process entire email with all components
   */
  async processEmail(filePath: string, bypassCache: boolean = false): Promise<UnifiedEmailProcessingResult> {
    // Check cache first (unless bypassed)
    if (!bypassCache) {
      const cachedResult = await this.cacheService.getCachedResult(filePath);
      if (cachedResult) {
        return cachedResult;
      }
    }

    const startTime = Date.now();
    const processingIssues = {
      failedComponents: [] as string[],
      warnings: [] as string[],
      errors: [] as string[]
    };

    try {
      // Step 1: Parse email and extract components
      const originalEmail = await this.emailProcessor.processEmailFile(filePath);
      
      // Step 2: Process all components
      const componentResults = await this.componentRouter.processEmailComponents(originalEmail);
      
      // Step 3: Enhanced image processing
      const imageResults = await this.imageExtractor.extractAndProcessAllImages(originalEmail);
      
      // Step 4: Enhanced attachment processing
      const attachmentResults = await this.attachmentProcessor.processAllAttachments(originalEmail.attachments);
      
      // Step 5: Correlate content across sources
      const correlationAnalysis = await this.contentCorrelator.correlateEmailContent(
        componentResults.textData,
        imageResults.ocrResults,
        this.flattenAttachmentData(attachmentResults)
      );
      
      // Step 6: Create unified results
      const finalResults = this.createUnifiedResults(correlationAnalysis);
      
      // Step 7: Generate processing metadata
      const totalProcessingTime = Date.now() - startTime;
      const processingMetadata = this.generateProcessingMetadata(
        originalEmail,
        componentResults,
        imageResults,
        attachmentResults,
        correlationAnalysis,
        finalResults,
        totalProcessingTime,
        processingIssues
      );
      
      // Step 8: Build audit trail
      const auditTrail = this.buildAuditTrail(correlationAnalysis, finalResults);

      const result: UnifiedEmailProcessingResult = {
        originalEmail,
        componentResults,
        imageResults,
        attachmentResults,
        correlationAnalysis,
        finalResults,
        processingMetadata,
        auditTrail
      };

      // Step 9: Cache the result for future use
      if (!bypassCache) {
        await this.cacheService.setCachedResult(filePath, result);
      }

      return result;

    } catch (error) {
      processingIssues.errors.push(`Email processing failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Unified email processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Flatten attachment processing results into ExtractedData array
   */
  private flattenAttachmentData(attachmentResults: AttachmentProcessingResult): ExtractedData[] {
    const allData: ExtractedData[] = [];
    
    for (const attachment of attachmentResults.processedAttachments) {
      allData.push(...attachment.extractedData);
      
      // Include sub-file data from archives
      if (attachment.subFiles) {
        for (const subFile of attachment.subFiles) {
          allData.push(...subFile.extractedData);
        }
      }
    }
    
    return allData;
  }

  /**
   * Create unified results from correlation analysis
   */
  private createUnifiedResults(correlationAnalysis: CorrelationAnalysis): ExtractedData[] {
    const unifiedResults: ExtractedData[] = [];
    const processedSkus = new Set<string>();

    // Process correlated items (highest quality)
    for (const correlation of correlationAnalysis.correlatedItems) {
      const sku = correlation.primarySource.sku;
      if (sku && !processedSkus.has(sku)) {
        processedSkus.add(sku);
        
        // Create enhanced result with correlation data
        const unifiedItem: ExtractedData = {
          ...correlation.primarySource,
          confidence: correlation.confidence,
          sources: correlation.sources,
          correlationData: {
            supportingEvidence: correlation.supportingEvidence.length,
            correlationNotes: correlation.correlationNotes,
            multiSourceConfidence: correlation.supportingEvidence.length > 0
          }
        };
        
        unifiedResults.push(unifiedItem);
      }
    }

    // Process orphaned items (lower priority)
    for (const orphan of correlationAnalysis.orphanedItems) {
      const sku = orphan.primarySource.sku;
      if (sku && !processedSkus.has(sku)) {
        processedSkus.add(sku);
        
        const orphanedItem: ExtractedData = {
          ...orphan.primarySource,
          confidence: orphan.confidence,
          sources: orphan.sources,
          correlationData: {
            supportingEvidence: 0,
            correlationNotes: orphan.correlationNotes || 'No cross-source validation',
            multiSourceConfidence: false,
            orphaned: true
          }
        };
        
        unifiedResults.push(orphanedItem);
      }
    }

    // Sort by confidence (highest first)
    return unifiedResults.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Generate comprehensive processing metadata
   */
  private generateProcessingMetadata(
    originalEmail: EmailDeconstructionResult,
    componentResults: ProcessedEmailResult,
    imageResults: ImageProcessingResult,
    attachmentResults: AttachmentProcessingResult,
    correlationAnalysis: CorrelationAnalysis,
    finalResults: ExtractedData[],
    totalProcessingTime: number,
    processingIssues: any
  ): UnifiedEmailProcessingResult['processingMetadata'] {

    // Calculate confidence distribution
    const confidenceDistribution = this.calculateConfidenceDistribution(finalResults);
    
    // Calculate source breakdown
    const sourceBreakdown = this.calculateSourceBreakdown(correlationAnalysis);
    
    // Calculate average confidence
    const averageConfidence = finalResults.length > 0 ?
      finalResults.reduce((sum, item) => sum + (item.confidence || 0), 0) / finalResults.length : 0;

    return {
      totalProcessingTime,
      componentsProcessed: {
        textComponents: componentResults.textData.length,
        imageComponents: imageResults.ocrResults.length,
        attachmentComponents: attachmentResults.totalAttachments,
        embeddedImages: originalEmail.embeddedImages.length
      },
      dataExtractionStats: {
        totalItemsExtracted: componentResults.textData.length + 
                           imageResults.ocrResults.length + 
                           this.flattenAttachmentData(attachmentResults).length,
        uniqueItemsAfterDeduplication: finalResults.length,
        averageConfidence,
        confidenceDistribution
      },
      sourceBreakdown,
      processingIssues
    };
  }

  /**
   * Calculate confidence distribution across results
   */
  private calculateConfidenceDistribution(results: ExtractedData[]): any {
    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      none: 0
    };

    for (const item of results) {
      const confidence = item.confidence || 0;
      if (confidence >= 0.9) distribution.excellent++;
      else if (confidence >= 0.7) distribution.good++;
      else if (confidence >= 0.5) distribution.fair++;
      else if (confidence >= 0.3) distribution.poor++;
      else distribution.none++;
    }

    return distribution;
  }

  /**
   * Calculate source breakdown from correlation analysis
   */
  private calculateSourceBreakdown(correlationAnalysis: CorrelationAnalysis): any {
    const breakdown = {
      textOnly: 0,
      imageOnly: 0,
      attachmentOnly: 0,
      multipleSources: 0
    };

    const allItems = [...correlationAnalysis.correlatedItems, ...correlationAnalysis.orphanedItems];
    
    for (const item of allItems) {
      if (item.sources.length > 1) {
        breakdown.multipleSources++;
      } else if (item.sources.includes('text')) {
        breakdown.textOnly++;
      } else if (item.sources.includes('image')) {
        breakdown.imageOnly++;
      } else if (item.sources.includes('attachment')) {
        breakdown.attachmentOnly++;
      }
    }

    return breakdown;
  }

  /**
   * Build comprehensive audit trail
   */
  private buildAuditTrail(
    correlationAnalysis: CorrelationAnalysis,
    finalResults: ExtractedData[]
  ): UnifiedEmailProcessingResult['auditTrail'] {
    
    const auditTrail: UnifiedEmailProcessingResult['auditTrail'] = {};
    
    const allCorrelations = [...correlationAnalysis.correlatedItems, ...correlationAnalysis.orphanedItems];
    
    for (const correlation of allCorrelations) {
      const sku = correlation.primarySource.sku;
      if (!sku) continue;
      
      const itemId = `${sku}_${correlation.primarySource.company || 'unknown'}`;
      
      auditTrail[itemId] = {
        sku,
        sources: correlation.sources,
        correlationRules: this.extractCorrelationRules(correlation.correlationNotes),
        confidenceHistory: [
          {
            stage: 'initial_extraction',
            confidence: correlation.primarySource.confidence || 0.5,
            reason: 'Initial data extraction'
          },
          {
            stage: 'correlation_analysis',
            confidence: correlation.confidence,
            reason: correlation.correlationNotes || 'No correlation data'
          }
        ],
        processingPath: this.buildProcessingPath(correlation)
      };
    }
    
    return auditTrail;
  }

  /**
   * Extract correlation rules from notes
   */
  private extractCorrelationRules(notes?: string): string[] {
    if (!notes) return [];
    
    const rulePattern = /(Exact SKU Match|Model Number Match|Brand \+ Model Match|Specification Match|Fuzzy SKU Match|Price \+ Company Match)/g;
    const matches = notes.match(rulePattern) || [];
    
    return [...new Set(matches)]; // Remove duplicates
  }

  /**
   * Build processing path for audit trail
   */
  private buildProcessingPath(correlation: any): string[] {
    const path = ['email_parsed'];
    
    if (correlation.sources.includes('text')) {
      path.push('text_extracted');
    }
    
    if (correlation.sources.includes('image')) {
      path.push('image_ocr_processed');
    }
    
    if (correlation.sources.includes('attachment')) {
      path.push('attachment_processed');
    }
    
    if (correlation.supportingEvidence && correlation.supportingEvidence.length > 0) {
      path.push('correlation_matched');
    }
    
    path.push('unified_result');
    
    return path;
  }

  /**
   * Get comprehensive processing summary
   */
  getProcessingSummary(result: UnifiedEmailProcessingResult): string {
    const { processingMetadata, finalResults } = result;
    
    const summaryParts = [
      `Processed email in ${processingMetadata.totalProcessingTime}ms`,
      `Components: ${processingMetadata.componentsProcessed.textComponents}T/${processingMetadata.componentsProcessed.imageComponents}I/${processingMetadata.componentsProcessed.attachmentComponents}A`,
      `Extracted: ${processingMetadata.dataExtractionStats.totalItemsExtracted} items`,
      `Unified: ${finalResults.length} unique items`,
      `Avg confidence: ${(processingMetadata.dataExtractionStats.averageConfidence * 100).toFixed(1)}%`,
      `Multi-source: ${processingMetadata.sourceBreakdown.multipleSources}`
    ];

    if (processingMetadata.processingIssues.errors.length > 0) {
      summaryParts.push(`Errors: ${processingMetadata.processingIssues.errors.length}`);
    }

    return summaryParts.join(' | ');
  }

  /**
   * Get detailed processing report
   */
  getDetailedReport(result: UnifiedEmailProcessingResult): string {
    const report = [
      '=== Unified Email Processing Report ===',
      `Email Source: ${result.originalEmail.processingMethod}`,
      `Processing Time: ${result.processingMetadata.totalProcessingTime}ms`,
      '',
      '=== Component Breakdown ===',
      `Text Components: ${result.processingMetadata.componentsProcessed.textComponents}`,
      `Image Components: ${result.processingMetadata.componentsProcessed.imageComponents}`,
      `Attachment Components: ${result.processingMetadata.componentsProcessed.attachmentComponents}`,
      `Embedded Images: ${result.processingMetadata.componentsProcessed.embeddedImages}`,
      '',
      '=== Data Extraction ===',
      `Total Items Extracted: ${result.processingMetadata.dataExtractionStats.totalItemsExtracted}`,
      `Unique Items After Deduplication: ${result.processingMetadata.dataExtractionStats.uniqueItemsAfterDeduplication}`,
      `Average Confidence: ${(result.processingMetadata.dataExtractionStats.averageConfidence * 100).toFixed(1)}%`,
      '',
      '=== Confidence Distribution ===',
      `Excellent (90%+): ${result.processingMetadata.dataExtractionStats.confidenceDistribution.excellent}`,
      `Good (70-89%): ${result.processingMetadata.dataExtractionStats.confidenceDistribution.good}`,
      `Fair (50-69%): ${result.processingMetadata.dataExtractionStats.confidenceDistribution.fair}`,
      `Poor (30-49%): ${result.processingMetadata.dataExtractionStats.confidenceDistribution.poor}`,
      `Very Poor (<30%): ${result.processingMetadata.dataExtractionStats.confidenceDistribution.none}`,
      '',
      '=== Source Distribution ===',
      `Text Only: ${result.processingMetadata.sourceBreakdown.textOnly}`,
      `Image Only: ${result.processingMetadata.sourceBreakdown.imageOnly}`,
      `Attachment Only: ${result.processingMetadata.sourceBreakdown.attachmentOnly}`,
      `Multiple Sources: ${result.processingMetadata.sourceBreakdown.multipleSources}`,
      ''
    ];

    // Add correlation summary
    report.push('=== Correlation Analysis ===');
    report.push(this.contentCorrelator.getCorrelationSummary(result.correlationAnalysis));
    report.push('');

    // Add top results
    report.push('=== Top Results (by confidence) ===');
    const topResults = result.finalResults.slice(0, 10);
    for (const item of topResults) {
      const sources = (item as any).sources ? ` (${(item as any).sources.join(', ')})` : '';
      report.push(`${item.sku} - ${item.company} - $${item.price} - ${((item.confidence || 0) * 100).toFixed(1)}%${sources}`);
    }

    // Add issues if any
    if (result.processingMetadata.processingIssues.errors.length > 0) {
      report.push('');
      report.push('=== Processing Issues ===');
      for (const error of result.processingMetadata.processingIssues.errors) {
        report.push(`ERROR: ${error}`);
      }
    }

    return report.join('\n');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cacheService.getCacheStats();
  }

  /**
   * Get cache summary
   */
  getCacheSummary(): string {
    return this.cacheService.getCacheSummary();
  }

  /**
   * Clear processing cache
   */
  async clearCache(): Promise<void> {
    await this.cacheService.clearCache();
  }

  /**
   * Preload cache for multiple emails
   */
  async preloadCache(emailPaths: string[]): Promise<void> {
    await this.cacheService.preloadCache(emailPaths);
  }

  /**
   * Get only extracted data from cache (lightweight)
   */
  async getCachedExtractedData(filePath: string): Promise<ExtractedData[] | null> {
    return await this.cacheService.getCachedExtractedData(filePath);
  }

  /**
   * Shutdown processor and cleanup resources
   */
  async shutdown(): Promise<void> {
    await this.cacheService.shutdown();
  }

  /**
   * Export results to different formats
   */
  exportResults(result: UnifiedEmailProcessingResult, format: 'json' | 'csv' | 'summary' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(result.finalResults, null, 2);
      
      case 'csv':
        return this.exportToCSV(result.finalResults);
      
      case 'summary':
        return this.getDetailedReport(result);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export results to CSV format
   */
  private exportToCSV(results: ExtractedData[]): string {
    if (results.length === 0) return 'No data to export';
    
    const headers = ['SKU', 'Company', 'Price', 'Model', 'Confidence', 'Sources', 'Correlation Notes'];
    const rows = [headers.join(',')];
    
    for (const item of results) {
      const row = [
        this.escapeCsvValue(item.sku || ''),
        this.escapeCsvValue(item.company || ''),
        item.price || '',
        this.escapeCsvValue(item.model || ''),
        ((item.confidence || 0) * 100).toFixed(1) + '%',
        this.escapeCsvValue((item as any).sources?.join('; ') || ''),
        this.escapeCsvValue((item as any).correlationData?.correlationNotes || '')
      ];
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }

  /**
   * Escape CSV values
   */
  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}