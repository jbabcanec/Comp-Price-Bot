import * as path from 'path';
import { EmailAttachment } from './emailProcessor.service';
import { ExtractedData } from '@shared/types/product.types';
import { FileProcessorService } from './fileProcessor.service';
import * as JSZip from 'jszip';

export interface ProcessedAttachment {
  originalFilename: string;
  contentType: string;
  size: number;
  processingMethod: string;
  extractedData: ExtractedData[];
  processingTime: number;
  success: boolean;
  errorMessage?: string;
  subFiles?: ProcessedAttachment[]; // For archives
}

export interface AttachmentProcessingResult {
  processedAttachments: ProcessedAttachment[];
  totalAttachments: number;
  successfulProcessing: number;
  failedProcessing: number;
  totalDataExtracted: number;
  processingStats: {
    byType: Record<string, { count: number; success: number; dataExtracted: number }>;
    averageProcessingTime: number;
    totalProcessingTime: number;
  };
}

export class EmailAttachmentProcessor {
  private fileProcessor: FileProcessorService;

  constructor() {
    this.fileProcessor = new FileProcessorService();
  }

  /**
   * Main entry point - process all email attachments
   */
  async processAllAttachments(attachments: EmailAttachment[]): Promise<AttachmentProcessingResult> {
    const startTime = Date.now();
    const processedAttachments: ProcessedAttachment[] = [];
    
    for (const attachment of attachments) {
      const processed = await this.processAttachment(attachment);
      processedAttachments.push(processed);
    }

    const totalProcessingTime = Date.now() - startTime;
    const processingStats = this.calculateProcessingStats(processedAttachments, totalProcessingTime);

    return {
      processedAttachments,
      totalAttachments: attachments.length,
      successfulProcessing: processedAttachments.filter(p => p.success).length,
      failedProcessing: processedAttachments.filter(p => !p.success).length,
      totalDataExtracted: processedAttachments.reduce((sum, p) => sum + p.extractedData.length, 0),
      processingStats
    };
  }

  /**
   * Process a single attachment based on its type
   */
  private async processAttachment(attachment: EmailAttachment): Promise<ProcessedAttachment> {
    const startTime = Date.now();
    const extension = path.extname(attachment.filename).toLowerCase();
    
    const result: ProcessedAttachment = {
      originalFilename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
      processingMethod: '',
      extractedData: [],
      processingTime: 0,
      success: false
    };

    try {
      switch (extension) {
        case '.pdf':
          result.extractedData = await this.processPDFAttachment(attachment);
          result.processingMethod = 'PDF_EXTRACTION';
          break;
          
        case '.xlsx':
        case '.xls':
          result.extractedData = await this.processExcelAttachment(attachment);
          result.processingMethod = 'EXCEL_EXTRACTION';
          break;
          
        case '.csv':
          result.extractedData = await this.processCSVAttachment(attachment);
          result.processingMethod = 'CSV_PARSING';
          break;
          
        case '.docx':
        case '.doc':
          result.extractedData = await this.processWordAttachment(attachment);
          result.processingMethod = 'WORD_EXTRACTION';
          break;
          
        case '.txt':
          result.extractedData = await this.processTextAttachment(attachment);
          result.processingMethod = 'TEXT_PARSING';
          break;
          
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.tiff':
        case '.bmp':
        case '.gif':
          result.extractedData = await this.processImageAttachment(attachment);
          result.processingMethod = 'IMAGE_OCR';
          break;
          
        case '.zip':
        case '.rar':
        case '.7z':
          const archiveResult = await this.processArchiveAttachment(attachment);
          result.extractedData = archiveResult.extractedData;
          result.subFiles = archiveResult.subFiles;
          result.processingMethod = 'ARCHIVE_EXTRACTION';
          break;
          
        case '.eml':
        case '.msg':
          result.extractedData = await this.processNestedEmailAttachment(attachment);
          result.processingMethod = 'NESTED_EMAIL';
          break;
          
        default:
          result.extractedData = await this.processUnknownAttachment(attachment);
          result.processingMethod = 'UNKNOWN_TYPE';
          break;
      }
      
      result.success = true;
    } catch (error) {
      result.success = false;
      result.errorMessage = error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error);
      result.processingMethod = `FAILED_${result.processingMethod || 'UNKNOWN'}`;
    }

    result.processingTime = Date.now() - startTime;
    return result;
  }

  /**
   * Process PDF attachments
   */
  private async processPDFAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const sourceName = `PDF Attachment: ${attachment.filename}`;
    return await this.fileProcessor.processPDF(attachment.content, sourceName);
  }

  /**
   * Process Excel attachments
   */
  private async processExcelAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const sourceName = `Excel Attachment: ${attachment.filename}`;
    return await this.fileProcessor.processExcel(attachment.content, sourceName);
  }

  /**
   * Process CSV attachments
   */
  private async processCSVAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const sourceName = `CSV Attachment: ${attachment.filename}`;
    const csvText = attachment.content.toString('utf8');
    return await this.fileProcessor.processCSV(csvText, sourceName);
  }

  /**
   * Process Word document attachments
   */
  private async processWordAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const sourceName = `Word Attachment: ${attachment.filename}`;
    return await this.fileProcessor.processWord(attachment.content, sourceName);
  }

  /**
   * Process text file attachments
   */
  private async processTextAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const sourceName = `Text Attachment: ${attachment.filename}`;
    const textContent = attachment.content.toString('utf8');
    return await this.fileProcessor.extractFromText(textContent, sourceName);
  }

  /**
   * Process image attachments with OCR
   */
  private async processImageAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const sourceName = `Image Attachment: ${attachment.filename}`;
    return await this.fileProcessor.processImage(attachment.content, sourceName);
  }

  /**
   * Process archive attachments (ZIP, RAR, etc.)
   */
  private async processArchiveAttachment(attachment: EmailAttachment): Promise<{
    extractedData: ExtractedData[];
    subFiles: ProcessedAttachment[];
  }> {
    const extension = path.extname(attachment.filename).toLowerCase();
    
    if (extension === '.zip') {
      return await this.processZipAttachment(attachment);
    } else {
      // For non-ZIP archives, we'd need additional libraries
      throw new Error(`Archive type ${extension} not yet supported`);
    }
  }

  /**
   * Process ZIP archive attachments
   */
  private async processZipAttachment(attachment: EmailAttachment): Promise<{
    extractedData: ExtractedData[];
    subFiles: ProcessedAttachment[];
  }> {
    const zip = await JSZip.loadAsync(attachment.content);
    const subFiles: ProcessedAttachment[] = [];
    const allExtractedData: ExtractedData[] = [];

    // Process each file in the ZIP
    for (const relativePath of Object.keys(zip.files)) {
      const zipEntry = zip.files[relativePath];
      
      if (zipEntry.dir) continue; // Skip directories
      
      try {
        const fileContent = await zipEntry.async('nodebuffer');
        const filename = path.basename(relativePath);
        
        // Create a synthetic attachment for the zip file entry
        const syntheticAttachment: EmailAttachment = {
          filename,
          content: fileContent,
          contentType: this.getContentTypeFromFilename(filename),
          size: fileContent.length
        };

        // Process the extracted file
        const processedSubFile = await this.processAttachment(syntheticAttachment);
        processedSubFile.originalFilename = `${attachment.filename}/${relativePath}`;
        
        subFiles.push(processedSubFile);
        allExtractedData.push(...processedSubFile.extractedData);
      } catch (error) {
        console.warn(`Failed to process file ${relativePath} from ZIP ${attachment.filename}:`, error instanceof Error ? error.message : String(error));
        
        // Add failed sub-file entry
        subFiles.push({
          originalFilename: `${attachment.filename}/${relativePath}`,
          contentType: 'unknown',
          size: 0,
          processingMethod: 'ZIP_EXTRACTION_FAILED',
          extractedData: [],
          processingTime: 0,
          success: false,
          errorMessage: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      extractedData: allExtractedData,
      subFiles
    };
  }

  /**
   * Process nested email attachments (EML/MSG files as attachments)
   */
  private async processNestedEmailAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    // This would recursively process email files
    // For now, treat as text extraction
    const sourceName = `Nested Email: ${attachment.filename}`;
    
    try {
      // Try to extract text content from the email file
      const emailText = attachment.content.toString('utf8');
      return await this.fileProcessor.extractFromText(emailText, sourceName);
    } catch (error) {
      console.warn(`Failed to process nested email ${attachment.filename}:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Process unknown file types by attempting text extraction
   */
  private async processUnknownAttachment(attachment: EmailAttachment): Promise<ExtractedData[]> {
    const sourceName = `Unknown Attachment: ${attachment.filename}`;
    
    try {
      // Try to extract text content
      const textContent = attachment.content.toString('utf8');
      
      // Basic validation to see if it's text-like content
      if (this.isValidText(textContent)) {
        return await this.fileProcessor.extractFromText(textContent, sourceName);
      } else {
        // Binary file or unrecognized format
        console.warn(`Cannot process binary/unknown file type: ${attachment.filename}`);
        return [];
      }
    } catch (error) {
      console.warn(`Failed to process unknown attachment ${attachment.filename}:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  /**
   * Get content type from filename
   */
  private getContentTypeFromFilename(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.xls': 'application/vnd.ms-excel',
      '.csv': 'text/csv',
      '.txt': 'text/plain',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.doc': 'application/msword',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff',
      '.zip': 'application/zip',
      '.eml': 'message/rfc822',
      '.msg': 'application/vnd.ms-outlook'
    };

    return contentTypes[extension] || 'application/octet-stream';
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
   * Calculate comprehensive processing statistics
   */
  private calculateProcessingStats(
    processedAttachments: ProcessedAttachment[],
    totalProcessingTime: number
  ): AttachmentProcessingResult['processingStats'] {
    const byType: Record<string, { count: number; success: number; dataExtracted: number }> = {};
    let totalIndividualTime = 0;

    for (const attachment of processedAttachments) {
      const extension = path.extname(attachment.originalFilename).toLowerCase() || 'unknown';
      
      if (!byType[extension]) {
        byType[extension] = { count: 0, success: 0, dataExtracted: 0 };
      }
      
      byType[extension].count++;
      if (attachment.success) {
        byType[extension].success++;
      }
      byType[extension].dataExtracted += attachment.extractedData.length;
      totalIndividualTime += attachment.processingTime;
    }

    return {
      byType,
      averageProcessingTime: processedAttachments.length > 0 ? 
        totalIndividualTime / processedAttachments.length : 0,
      totalProcessingTime
    };
  }

  /**
   * Get processing summary for reporting
   */
  getProcessingSummary(result: AttachmentProcessingResult): string {
    const { totalAttachments, successfulProcessing, failedProcessing, totalDataExtracted } = result;
    
    const summaryParts = [
      `Processed ${totalAttachments} attachments`,
      `Success: ${successfulProcessing}`,
      `Failed: ${failedProcessing}`,
      `Total data extracted: ${totalDataExtracted} items`
    ];

    // Add type breakdown
    const typeBreakdown = Object.entries(result.processingStats.byType)
      .map(([type, stats]) => `${type}: ${stats.success}/${stats.count}`)
      .join(', ');
    
    if (typeBreakdown) {
      summaryParts.push(`Types: ${typeBreakdown}`);
    }

    return summaryParts.join(' | ');
  }

  /**
   * Get detailed processing report
   */
  getDetailedReport(result: AttachmentProcessingResult): string {
    const report = [
      '=== Email Attachment Processing Report ===',
      `Total Attachments: ${result.totalAttachments}`,
      `Successful: ${result.successfulProcessing}`,
      `Failed: ${result.failedProcessing}`,
      `Total Data Extracted: ${result.totalDataExtracted} items`,
      `Average Processing Time: ${result.processingStats.averageProcessingTime.toFixed(2)}ms`,
      '',
      '=== By File Type ===',
    ];

    for (const [type, stats] of Object.entries(result.processingStats.byType)) {
      const successRate = stats.count > 0 ? ((stats.success / stats.count) * 100).toFixed(1) : '0';
      report.push(`${type}: ${stats.success}/${stats.count} (${successRate}%) - ${stats.dataExtracted} items extracted`);
    }

    report.push('');
    report.push('=== Individual Files ===');

    for (const attachment of result.processedAttachments) {
      const status = attachment.success ? '✓' : '✗';
      const error = attachment.errorMessage ? ` (${attachment.errorMessage})` : '';
      report.push(`${status} ${attachment.originalFilename} - ${attachment.extractedData.length} items - ${attachment.processingTime}ms${error}`);
      
      if (attachment.subFiles && attachment.subFiles.length > 0) {
        for (const subFile of attachment.subFiles) {
          const subStatus = subFile.success ? '  ✓' : '  ✗';
          const subError = subFile.errorMessage ? ` (${subFile.errorMessage})` : '';
          report.push(`${subStatus} ${subFile.originalFilename} - ${subFile.extractedData.length} items${subError}`);
        }
      }
    }

    return report.join('\n');
  }
}