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

      // Return empty data - AI extraction should be used instead
      logger.info('file-ops', 'Content extracted, use AI extractor for parsing', {
        filePath,
        contentLength: contentResult.content.length,
        contentType: contentResult.contentType
      });

      return {
        success: true,
        data: [], // No parsing - use AI extractor instead
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
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    logger.info('file-ops', 'FileProcessor cleanup complete');
  }
}