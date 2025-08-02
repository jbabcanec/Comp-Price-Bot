import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { IPC_CHANNELS } from '../channels';
import { FileSelectOptions } from '@shared/types/ipc.types';
import { FileProcessorService } from '../../services/fileProcessor.service';
import { SuperchargedFileProcessor } from '../../services/superchargedFileProcessor.service';
import { ProductValidatorService } from '../../services/productValidator.service';
import { logger } from '../../services/logger.service';

// Initialize with dynamic OpenAI support  
let fileProcessor: FileProcessorService;
let superchargedProcessor: SuperchargedFileProcessor;
let productValidator: ProductValidatorService;

async function getFileProcessor(): Promise<FileProcessorService> {
  if (!fileProcessor) {
    try {
      // Try to get OpenAI API key from secure storage
      const { ApiKeyService } = await import('../../services/apiKey.service');
      const apiKeyService = new ApiKeyService();
      const openaiKey = await apiKeyService.getOpenAIKey();
      
      if (openaiKey) {
        logger.info('file-ops', 'Initializing FileProcessor with OpenAI support');
        fileProcessor = new FileProcessorService(openaiKey);
      } else {
        logger.info('file-ops', 'Initializing FileProcessor without OpenAI support');
        fileProcessor = new FileProcessorService();
      }
    } catch (error) {
      logger.warn('file-ops', 'Failed to get OpenAI key, proceeding without AI support', error);
      fileProcessor = new FileProcessorService();
    }
  }
  return fileProcessor;
}

async function getSuperchargedProcessor(): Promise<SuperchargedFileProcessor> {
  if (!superchargedProcessor) {
    try {
      // Try to get OpenAI API key from secure storage
      const { ApiKeyService } = await import('../../services/apiKey.service');
      const apiKeyService = new ApiKeyService();
      const openaiKey = await apiKeyService.getOpenAIKey();
      
      if (openaiKey) {
        logger.info('file-ops', 'Initializing Supercharged Processor with full AI capabilities');
        superchargedProcessor = new SuperchargedFileProcessor(openaiKey);
      } else {
        logger.info('file-ops', 'Initializing Supercharged Processor with traditional methods only');
        superchargedProcessor = new SuperchargedFileProcessor();
      }
    } catch (error) {
      logger.warn('file-ops', 'Failed to initialize Supercharged Processor', error);
      superchargedProcessor = new SuperchargedFileProcessor();
    }
  }
  return superchargedProcessor;
}

function getProductValidator(): ProductValidatorService {
  if (!productValidator) {
    productValidator = new ProductValidatorService();
  }
  return productValidator;
}

export function registerFileHandlers(): void {
  // File selection dialog
  ipcMain.handle(IPC_CHANNELS.FILE_SELECT, async (_, options: FileSelectOptions) => {
    logger.app('file-select', 'User initiated file selection dialog', {
      title: options.title,
      filters: options.filters,
      properties: options.properties
    });
    
    try {
      const result = await dialog.showOpenDialog({
        title: options.title || 'Select File',
        defaultPath: options.defaultPath,
        buttonLabel: options.buttonLabel,
        filters: options.filters || [],
        properties: options.properties || ['openFile']
      });

      if (result.canceled || result.filePaths.length === 0) {
        logger.info('app', 'File selection dialog canceled by user');
        return { success: true, data: null };
      }

      const selectedFile = result.filePaths[0];
      logger.fileOperation('select', selectedFile, true, 'File selected by user');
      return { success: true, data: selectedFile };
    } catch (error) {
      logger.error('file-ops', 'File selection dialog failed', 
        error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'FILE_SELECT_ERROR'
        }
      };
    }
  });

  // File read operation
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_, filePath: string) => {
    logger.fileOperation('read', filePath, true, 'Starting file read');
    const startTime = Date.now();
    
    try {
      const content = await readFile(filePath, 'utf-8');
      const readTime = Date.now() - startTime;
      
      logger.fileOperation('read', filePath, true, 
        `File read complete - Size: ${content.length} chars, Time: ${readTime}ms`);
      
      return { success: true, data: content };
    } catch (error) {
      const readTime = Date.now() - startTime;
      logger.fileOperation('read', filePath, false, 
        `File read failed after ${readTime}ms`, 
        error instanceof Error ? error : new Error(String(error)));
        
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'FILE_READ_ERROR'
        }
      };
    }
  });

  // File write operation
  ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_, filePath: string, content: string) => {
    logger.fileOperation('write', filePath, true, `Starting file write - Size: ${content.length} chars`);
    const startTime = Date.now();
    
    try {
      await writeFile(filePath, content, 'utf-8');
      const writeTime = Date.now() - startTime;
      
      logger.fileOperation('write', filePath, true, 
        `File write complete - Time: ${writeTime}ms`);
        
      return { success: true, data: true };
    } catch (error) {
      const writeTime = Date.now() - startTime;
      logger.fileOperation('write', filePath, false, 
        `File write failed after ${writeTime}ms`, 
        error instanceof Error ? error : new Error(String(error)));
        
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'FILE_WRITE_ERROR'
        }
      };
    }
  });

  // Real file processing using FileProcessorService
  ipcMain.handle(IPC_CHANNELS.FILE_PROCESS, async (_, filePath: string) => {
    logger.app('file-process', 'User initiated file processing', { filePath });
    
    try {
      const processor = await getSuperchargedProcessor();
      const result = await processor.processFileWithFallbacks(filePath);
      
      if (result.success) {
        logger.info('app', 'File processing completed successfully', {
          filePath,
          itemsExtracted: result.data.length,
          processingTime: result.processingTime,
          extractionMethod: result.extractionMethod
        });
      } else {
        logger.warn('app', 'File processing completed with errors', {
          filePath,
          error: result.error
        });
      }
      
      return { 
        success: result.success, 
        data: result,
        error: result.success ? undefined : { message: result.error, code: 'FILE_PROCESS_ERROR' }
      };
    } catch (error) {
      logger.error('app', 'File processing failed unexpectedly', 
        error instanceof Error ? error : new Error(String(error)),
        { filePath });
        
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown processing error',
          code: 'FILE_PROCESS_ERROR'
        }
      };
    }
  });

  // Directory scanning for "Our Files"
  ipcMain.handle(IPC_CHANNELS.FILE_SCAN_DIRECTORY, async (_, directoryPath: string) => {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      const files = entries
        .filter(entry => entry.isFile())
        .map(entry => ({
          name: entry.name,
          path: path.join(directoryPath, entry.name),
          extension: path.extname(entry.name).toLowerCase(),
          isSupported: ['.csv', '.xlsx', '.xls', '.json', '.txt'].includes(path.extname(entry.name).toLowerCase())
        }));

      return { success: true, data: files };
    } catch (error) {
      console.error('IPC Error - Directory Scan:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: 'DIRECTORY_SCAN_ERROR'
        }
      };
    }
  });

  // Batch file processing for selected files from directory
  ipcMain.handle(IPC_CHANNELS.FILE_PROCESS_BATCH, async (_, filePaths: string[]) => {
    logger.info('file-ops', 'Starting batch file processing', { 
      fileCount: filePaths.length,
      files: filePaths.map(p => p.split('/').pop()).join(', ')
    });
    
    const startTime = Date.now();
    
    try {
      // Process files in parallel for better performance
      const processor = await getSuperchargedProcessor();
      
      const promises = filePaths.map(async (filePath) => {
        const fileStartTime = Date.now();
        try {
          logger.debug('file-ops', 'Processing file in batch', { filePath });
          const result = await processor.processFileWithFallbacks(filePath);
          const fileProcessTime = Date.now() - fileStartTime;
          
          logger.info('file-ops', 'Batch file processed', {
            filePath,
            success: result.success,
            itemsFound: result.data.length,
            processingTime: fileProcessTime
          });
          
          return result;
        } catch (error) {
          const fileProcessTime = Date.now() - fileStartTime;
          logger.error('file-ops', `Error processing file in batch: ${filePath}`, 
            error instanceof Error ? error : new Error(String(error)));
          
          return {
            success: false,
            fileName: filePath.split('/').pop() || 'unknown',
            fileType: 'unknown',
            processingTime: fileProcessTime,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });

      // Process up to 3 files concurrently to avoid overwhelming the system
      const batchSize = 3;
      const results = [];
      
      for (let i = 0; i < promises.length; i += batchSize) {
        const batch = promises.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
        
        // Log progress
        const processed = Math.min(i + batchSize, promises.length);
        logger.info('file-ops', 'Batch processing progress', {
          processed,
          total: promises.length,
          percentage: Math.round((processed / promises.length) * 100)
        });
      }
      
      const totalTime = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;
      const totalItems = results.reduce((sum, r) => sum + r.data.length, 0);
      
      logger.info('file-ops', 'Batch processing complete', {
        totalFiles: filePaths.length,
        successfulFiles: successCount,
        failedFiles: filePaths.length - successCount,
        totalItemsExtracted: totalItems,
        totalProcessingTime: totalTime,
        avgTimePerFile: Math.round(totalTime / filePaths.length)
      });

      return { success: true, data: results };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      logger.error('file-ops', 'Batch processing failed', 
        error instanceof Error ? error : new Error(String(error)),
        { totalTime });
      
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown batch processing error',
          code: 'BATCH_PROCESS_ERROR'
        }
      };
    }
  });

  // Product validation handler
  ipcMain.handle('file:validateProducts', async (_, extractedData) => {
    try {
      const validator = getProductValidator();
      const validationResult = await validator.processBulkImport(extractedData);
      return { success: true, data: validationResult };
    } catch (error) {
      console.error('IPC Error - Product Validation:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown validation error',
          code: 'PRODUCT_VALIDATION_ERROR'
        }
      };
    }
  });

  logger.info('app', 'File IPC handlers registered');
}