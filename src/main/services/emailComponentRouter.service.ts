import * as path from 'path';
import { EmailDeconstructionResult, EmailAttachment, EmbeddedImage } from './emailProcessor.service';
import { FileProcessorService } from './fileProcessor.service';
import { ExtractedData } from '@shared/types/product.types';

export interface CorrelatedEmailData {
  primarySource: ExtractedData;
  supportingEvidence: ExtractedData[];
  confidence: number;
  sources: string[];
  correlationNotes?: string;
}

export interface ProcessedEmailResult {
  // Raw extracted data from all sources
  textData: ExtractedData[];
  imageData: ExtractedData[];
  attachmentData: ExtractedData[];
  
  // Correlated and enhanced results
  correlatedData: CorrelatedEmailData[];
  
  // Processing metadata
  processingStats: {
    totalComponents: number;
    textComponents: number;
    imageComponents: number;
    attachmentComponents: number;
    processingTime: number;
    confidenceDistribution: {
      excellent: number; // 0.9+
      good: number;      // 0.7-0.9
      fair: number;      // 0.5-0.7
      poor: number;      // 0.3-0.5
      none: number;      // <0.3
    };
  };
  
  // Source tracking for audit
  sourceMap: {
    [productId: string]: {
      textMentions: string[];
      imageSources: string[];
      attachmentSources: string[];
    };
  };
}

export class EmailComponentRouter {
  private fileProcessor: FileProcessorService;

  constructor() {
    this.fileProcessor = new FileProcessorService();
  }

  /**
   * Main entry point - process all email components and correlate results
   */
  async processEmailComponents(email: EmailDeconstructionResult): Promise<ProcessedEmailResult> {
    const startTime = Date.now();
    const allResults: ExtractedData[] = [];

    // Process text content
    const textData = await this.processTextContent(email);
    allResults.push(...textData);

    // Process HTML content
    const htmlData = await this.processHTMLContent(email);
    allResults.push(...htmlData);

    // Process attachments
    const attachmentData = await this.processAttachments(email.attachments);
    allResults.push(...attachmentData);

    // Process embedded images
    const imageData = await this.processEmbeddedImages(email.embeddedImages);
    allResults.push(...imageData);

    // Correlate results across sources
    const correlatedData = await this.correlateResults(textData, imageData, attachmentData);

    // Calculate processing stats
    const processingTime = Date.now() - startTime;
    const processingStats = this.calculateProcessingStats(
      textData,
      imageData, 
      attachmentData,
      processingTime
    );

    // Build source map
    const sourceMap = this.buildSourceMap(correlatedData);

    return {
      textData,
      imageData,
      attachmentData,
      correlatedData,
      processingStats,
      sourceMap
    };
  }

  /**
   * Process text content from email body
   */
  private async processTextContent(email: EmailDeconstructionResult): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];

    if (email.textContent && email.textContent.trim()) {
      try {
        const textResults = await this.fileProcessor.extractFromText(
          email.textContent,
          'Email Text Content'
        );
        results.push(...textResults);
      } catch (error) {
        console.warn('Failed to process email text content:', error instanceof Error ? error.message : String(error));
      }
    }

    return results;
  }

  /**
   * Process HTML content with table extraction
   */
  private async processHTMLContent(email: EmailDeconstructionResult): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];

    if (email.htmlContent && email.htmlContent.trim()) {
      try {
        // Convert HTML to text for processing
        const htmlText = this.extractTextFromHTML(email.htmlContent);
        if (htmlText.trim()) {
          const htmlResults = await this.fileProcessor.extractFromText(
            htmlText,
            'Email HTML Content'
          );
          results.push(...htmlResults);
        }

        // Extract structured data from HTML tables
        const tableData = this.extractTableDataFromHTML(email.htmlContent);
        if (tableData.length > 0) {
          const tableResults = await this.fileProcessor.extractFromText(
            tableData.join('\n'),
            'Email HTML Tables'
          );
          results.push(...tableResults);
        }
      } catch (error) {
        console.warn('Failed to process email HTML content:', error instanceof Error ? error.message : String(error));
      }
    }

    return results;
  }

  /**
   * Process all email attachments with appropriate handlers
   */
  private async processAttachments(attachments: EmailAttachment[]): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];

    for (const attachment of attachments) {
      try {
        const attachmentResults = await this.routeAttachment(attachment);
        results.push(...attachmentResults);
      } catch (error) {
        console.warn(`Failed to process attachment ${attachment.filename}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return results;
  }

  /**
   * Route attachment to appropriate processor based on file type
   */
  private async routeAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const extension = path.extname(attachment.filename).toLowerCase();
    const sourceName = `Attachment: ${attachment.filename}`;

    switch (extension) {
      case '.pdf':
        return await this.fileProcessor.processPDF(attachment.content, sourceName);
      
      case '.xlsx':
      case '.xls':
        return await this.fileProcessor.processExcel(attachment.content, sourceName);
      
      case '.csv':
        return await this.fileProcessor.processCSV(attachment.content.toString('utf8'), sourceName);
      
      case '.docx':
      case '.doc':
        return await this.fileProcessor.processWord(attachment.content, sourceName);
      
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.tiff':
      case '.bmp':
        return await this.fileProcessor.processImage(attachment.content, sourceName);
      
      case '.txt':
        return await this.fileProcessor.extractFromText(
          attachment.content.toString('utf8'),
          sourceName
        );
      
      case '.zip':
      case '.rar':
        // For archives, we'd need to extract and process contents
        // For now, treat as binary
        return [];
      
      default:
        // Try to extract text from unknown file types
        try {
          const textContent = attachment.content.toString('utf8');
          if (this.isValidText(textContent)) {
            return await this.fileProcessor.extractFromText(textContent, sourceName);
          }
        } catch (error) {
          // Not text-based content
        }
        return [];
    }
  }

  /**
   * Process embedded images with OCR
   */
  private async processEmbeddedImages(embeddedImages: EmbeddedImage[]): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];

    for (const image of embeddedImages) {
      try {
        const sourceName = `Embedded Image: ${image.contentId}`;
        const imageResults = await this.fileProcessor.processImage(image.data, sourceName);
        results.push(...imageResults);
      } catch (error) {
        console.warn(`Failed to process embedded image ${image.contentId}:`, error instanceof Error ? error.message : String(error));
      }
    }

    return results;
  }

  /**
   * Correlate results from different sources to find matching products
   */
  private async correlateResults(
    textResults: ExtractedData[],
    imageResults: ExtractedData[],
    attachmentResults: ExtractedData[]
  ): Promise<CorrelatedEmailData[]> {
    const correlatedResults: CorrelatedEmailData[] = [];
    const processedSkus = new Set<string>();

    // Process text results as primary sources
    for (const textProduct of textResults) {
      if (processedSkus.has(textProduct.sku)) continue;
      processedSkus.add(textProduct.sku);

      const correlation: CorrelatedEmailData = {
        primarySource: textProduct,
        supportingEvidence: [],
        confidence: textProduct.confidence || 0.5,
        sources: ['text']
      };

      // Look for matching SKUs in images
      const matchingImages = imageResults.filter(img => 
        this.skuMatch(textProduct.sku, img.sku)
      );

      if (matchingImages.length > 0) {
        correlation.supportingEvidence.push(...matchingImages);
        correlation.sources.push('image');
        correlation.confidence = Math.min(1.0, correlation.confidence + 0.2);
        correlation.correlationNotes = `Found ${matchingImages.length} supporting image(s)`;
      }

      // Look for matching data in attachments
      const matchingAttachments = attachmentResults.filter(att =>
        this.skuMatch(textProduct.sku, att.sku)
      );

      if (matchingAttachments.length > 0) {
        correlation.supportingEvidence.push(...matchingAttachments);
        correlation.sources.push('attachment');
        correlation.confidence = Math.min(1.0, correlation.confidence + 0.15);
        
        const existingNotes = correlation.correlationNotes || '';
        correlation.correlationNotes = existingNotes + 
          (existingNotes ? '; ' : '') + `Found ${matchingAttachments.length} supporting attachment(s)`;
      }

      correlatedResults.push(correlation);
    }

    // Handle orphaned data (products only found in images or attachments)
    const orphanedResults = this.findOrphanedData(imageResults, attachmentResults, textResults);
    correlatedResults.push(...orphanedResults);

    return correlatedResults;
  }

  /**
   * Find data that exists only in images or attachments (not mentioned in text)
   */
  private findOrphanedData(
    imageResults: ExtractedData[],
    attachmentResults: ExtractedData[],
    textResults: ExtractedData[]
  ): CorrelatedEmailData[] {
    const orphaned: CorrelatedEmailData[] = [];
    const textSkus = new Set(textResults.map(t => t.sku));

    // Check image results
    for (const imageResult of imageResults) {
      if (!textSkus.has(imageResult.sku)) {
        orphaned.push({
          primarySource: imageResult,
          supportingEvidence: [],
          confidence: Math.max(0.3, (imageResult.confidence || 0.5) - 0.2), // Lower confidence for orphaned data
          sources: ['image'],
          correlationNotes: 'Found only in image content'
        });
      }
    }

    // Check attachment results
    for (const attachmentResult of attachmentResults) {
      if (!textSkus.has(attachmentResult.sku)) {
        orphaned.push({
          primarySource: attachmentResult,
          supportingEvidence: [],
          confidence: Math.max(0.3, (attachmentResult.confidence || 0.5) - 0.1), // Slightly lower confidence
          sources: ['attachment'],
          correlationNotes: 'Found only in attachment'
        });
      }
    }

    return orphaned;
  }

  /**
   * Check if two SKUs match (with normalization)
   */
  private skuMatch(sku1: string, sku2: string): boolean {
    if (!sku1 || !sku2) return false;
    
    // Normalize SKUs for comparison
    const normalize = (sku: string) => sku.replace(/[-\s]/g, '').toUpperCase();
    
    return normalize(sku1) === normalize(sku2);
  }

  /**
   * Extract text content from HTML
   */
  private extractTextFromHTML(html: string): string {
    // Simple HTML to text conversion (in production, use a proper library)
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract structured data from HTML tables
   */
  private extractTableDataFromHTML(html: string): string[] {
    const tableData: string[] = [];
    
    // Simple table extraction (in production, use a proper HTML parser)
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gis;

    let tableMatch;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableContent = tableMatch[1];
      let rowMatch;
      
      while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
        const rowContent = rowMatch[1];
        const cells: string[] = [];
        let cellMatch;
        
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          const cellText = this.extractTextFromHTML(cellMatch[1]);
          if (cellText.trim()) {
            cells.push(cellText.trim());
          }
        }
        
        if (cells.length > 0) {
          tableData.push(cells.join('\t'));
        }
      }
    }

    return tableData;
  }

  /**
   * Check if content appears to be valid text
   */
  private isValidText(content: string): boolean {
    if (!content || content.length < 10) return false;
    
    // Check for high ratio of printable characters
    const printableChars = content.match(/[\x20-\x7E\s]/g)?.length || 0;
    const ratio = printableChars / content.length;
    
    return ratio > 0.7;
  }

  /**
   * Calculate processing statistics
   */
  private calculateProcessingStats(
    textData: ExtractedData[],
    imageData: ExtractedData[],
    attachmentData: ExtractedData[],
    processingTime: number
  ) {
    const allData = [...textData, ...imageData, ...attachmentData];
    
    const confidenceDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      none: 0
    };

    for (const item of allData) {
      const confidence = item.confidence || 0;
      if (confidence >= 0.9) confidenceDistribution.excellent++;
      else if (confidence >= 0.7) confidenceDistribution.good++;
      else if (confidence >= 0.5) confidenceDistribution.fair++;
      else if (confidence >= 0.3) confidenceDistribution.poor++;
      else confidenceDistribution.none++;
    }

    return {
      totalComponents: textData.length + imageData.length + attachmentData.length,
      textComponents: textData.length,
      imageComponents: imageData.length,
      attachmentComponents: attachmentData.length,
      processingTime,
      confidenceDistribution
    };
  }

  /**
   * Build source map for audit trail
   */
  private buildSourceMap(correlatedData: CorrelatedEmailData[]): Record<string, any> {
    const sourceMap: Record<string, any> = {};

    for (const correlation of correlatedData) {
      const sku = correlation.primarySource.sku;
      if (!sku) continue;

      sourceMap[sku] = {
        textMentions: correlation.sources.includes('text') ? [correlation.primarySource.source || 'Email Text'] : [],
        imageSources: correlation.supportingEvidence
          .filter(e => e.source?.includes('Image'))
          .map(e => e.source || 'Unknown Image'),
        attachmentSources: correlation.supportingEvidence
          .filter(e => e.source?.includes('Attachment'))
          .map(e => e.source || 'Unknown Attachment')
      };
    }

    return sourceMap;
  }
}