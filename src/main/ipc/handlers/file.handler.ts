import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { IPC_CHANNELS } from '../channels';
import { FileSelectOptions } from '@shared/types/ipc.types';
import { FileProcessorService } from '../../services/fileProcessor.service';
import { ProductValidatorService } from '../../services/productValidator.service';
import { logger } from '../../services/logger.service';

const fileProcessor = new FileProcessorService();
const productValidator = new ProductValidatorService();

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
      const result = await fileProcessor.processFile(filePath);
      
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
    try {
      const results = [];
      
      for (const filePath of filePaths) {
        try {
          const result = await fileProcessor.processFile(filePath);
          results.push(result);
        } catch (error) {
          console.error(`Error processing ${filePath}:`, error);
          results.push({
            success: false,
            fileName: filePath.split('/').pop() || 'unknown',
            fileType: 'unknown',
            processingTime: 0,
            data: [],
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return { success: true, data: results };
    } catch (error) {
      console.error('IPC Error - Batch Process:', error);
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
      const validationResult = await productValidator.processBulkImport(extractedData);
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