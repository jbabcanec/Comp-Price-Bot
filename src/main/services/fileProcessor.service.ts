import { ContentReaderService, ContentReaderResult } from './extraction/content-reader.service';
import { ExtractedData } from '@shared/types/product.types';
import { logger } from './logger.service';
import * as path from 'path';

/**
 * File processing result with metadata - SIMPLIFIED
 */
export interface ProcessingResult {
  success: boolean;
  data: ExtractedData[];
  fileName: string;
  fileType: string;
  processingTime: number;
  error?: string;
  warnings?: string[];
  extractionMethod?: 'traditional' | 'openai' | 'hybrid';
}

/**
 * SIMPLIFIED File Processor - Only gets raw content from files
 * No hardcoded patterns, no complex parsing logic
 * All extraction is done by AI via the AIExtractorService
 */
export class FileProcessorService {
  private contentReader: ContentReaderService;
  
  constructor(openaiApiKey?: string) {
    this.contentReader = new ContentReaderService();
    logger.info('file-ops', 'Initialized simplified FileProcessor - content reading only');
  }

  /**
   * Get raw content from any file type
   * No parsing, no pattern matching - just content extraction
   */
  async getFileContent(filePath: string): Promise<ContentReaderResult> {
    logger.debug('file-ops', 'Getting file content', { filePath });
    return await this.contentReader.getContent(filePath);
  }

  /**
   * Legacy method for backward compatibility
   * Now simply returns raw content without any parsing
   */
  async processFile(filePath: string, useOpenAI: boolean = true): Promise<{
    success: boolean;
    data: ExtractedData[];
    fileName: string;
    fileType: string;
    processingTime: number;
    error?: string;
    extractionMethod?: 'traditional' | 'openai' | 'hybrid';
  }> {
    const startTime = Date.now();
    const fileName = path.basename(filePath);
    const fileType = path.extname(filePath);

    try {
      // Just get the content - no parsing
      const contentResult = await this.contentReader.getContent(filePath);
      
      if (!contentResult.success) {
        return {
          success: false,
          data: [],
          fileName,
          fileType,
          processingTime: Date.now() - startTime,
          error: contentResult.error || 'Failed to read file content',
          extractionMethod: 'traditional'
        };
      }

      // For price book import, do basic structured data parsing
      const extension = fileType.toLowerCase();
      let extractedData: ExtractedData[] = [];

      if (extension === '.csv' && contentResult.contentType === 'csv') {
        // Parse CSV content
        extractedData = this.parseCSVContent(contentResult.content);
      } else if (['.xlsx', '.xls'].includes(extension) && contentResult.contentType === 'csv') {
        // Excel files are converted to CSV by content reader
        extractedData = this.parseCSVContent(contentResult.content);
      } else if (extension === '.json' && contentResult.contentType === 'json') {
        // Parse JSON content
        extractedData = this.parseJSONContent(contentResult.content);
      } else {
        logger.warn('file-ops', 'Unsupported file type for price book import', { extension, contentType: contentResult.contentType });
      }

      logger.info('file-ops', 'Price book data extracted', {
        filePath,
        contentLength: contentResult.content.length,
        contentType: contentResult.contentType,
        productsFound: extractedData.length
      });

      return {
        success: true,
        data: extractedData,
        fileName,
        fileType,
        processingTime: Date.now() - startTime,
        extractionMethod: 'traditional'
      };

    } catch (error) {
      logger.error('file-ops', 'File processing failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        data: [],
        fileName,
        fileType,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        extractionMethod: 'traditional'
      };
    }
  }

  /**
   * Parse CSV content into structured data
   */
  private parseCSVContent(csvContent: string): ExtractedData[] {
    try {
      logger.debug('file-ops', 'Parsing CSV content', { contentLength: csvContent.length });
      
      const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
      logger.debug('file-ops', 'CSV lines found', { totalLines: lines.length });
      
      if (lines.length < 2) {
        logger.warn('file-ops', 'CSV has insufficient lines', { lines: lines.length });
        return [];
      }

      // Get headers - handle quoted CSV properly
      const headerLine = lines[0];
      const headers = this.parseCSVRow(headerLine).map(h => h.toLowerCase());
      const dataRows = lines.slice(1);
      
      logger.debug('file-ops', 'CSV headers parsed', { headers, dataRowCount: dataRows.length });

      const extractedData: ExtractedData[] = [];
      let skippedRows = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const values = this.parseCSVRow(row);
        
        // More flexible row validation - allow missing trailing columns
        if (values.length < Math.min(3, headers.length)) {
          skippedRows++;
          logger.debug('file-ops', `Skipping row ${i + 2}: insufficient columns`, { 
            values: values.length, 
            expected: headers.length,
            content: row.substring(0, 100) 
          });
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          const value = values[index] || ''; // Handle missing trailing columns
          // Try to parse numbers
          const numValue = parseFloat(value);
          rowData[header] = isNaN(numValue) ? value : numValue;
        });

        // Map common fields with more flexible field matching
        const product: ExtractedData = {
          sku: rowData.sku || rowData.model || rowData.part_number || rowData['part number'] || rowData.partnumber || '',
          company: rowData.company || rowData.brand || rowData.manufacturer || rowData.mfg || '',
          model: rowData.model || rowData.sku || rowData['model number'] || '',
          description: rowData.description || rowData.desc || rowData.name || rowData.title || '',
          price: rowData.price || rowData.msrp || rowData.cost || rowData['list price'] || undefined,
          type: rowData.type || rowData.category || rowData.producttype || rowData['product type'] || ''
        };

        // More lenient validation - just need SKU or model
        if (product.sku || product.model) {
          extractedData.push(product);
        } else {
          skippedRows++;
          logger.debug('file-ops', `Skipping row ${i + 2}: no SKU or model`, { rowData });
        }
      }

      logger.info('file-ops', 'CSV parsing complete', { 
        totalRows: dataRows.length,
        extractedProducts: extractedData.length,
        skippedRows 
      });

      return extractedData;
    } catch (error) {
      logger.error('file-ops', 'CSV parsing failed', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Parse a single CSV row handling quotes and commas properly
   */
  private parseCSVRow(row: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      
      if (char === '"') {
        if (inQuotes && row[i + 1] === '"') {
          // Handle escaped quotes
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add final field
    values.push(current.trim());
    
    return values;
  }

  /**
   * Parse JSON content into structured data
   */
  private parseJSONContent(jsonContent: string): ExtractedData[] {
    try {
      const data = JSON.parse(jsonContent);
      
      if (!Array.isArray(data)) {
        logger.warn('file-ops', 'JSON data is not an array');
        return [];
      }

      const extractedData: ExtractedData[] = [];

      for (const item of data) {
        if (typeof item !== 'object') continue;

        const product: ExtractedData = {
          sku: item.sku || item.model || item.part_number || '',
          company: item.company || item.brand || item.manufacturer || '',
          model: item.model || item.sku || '',
          description: item.description || item.desc || '',
          price: item.price || item.msrp || item.cost || undefined,
          type: item.type || item.category || ''
        };

        if (product.sku) {
          extractedData.push(product);
        }
      }

      return extractedData;
    } catch (error) {
      logger.error('file-ops', 'JSON parsing failed', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    logger.info('file-ops', 'FileProcessor cleanup complete');
  }
}