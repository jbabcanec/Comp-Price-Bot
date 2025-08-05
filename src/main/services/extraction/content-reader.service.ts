import * as fs from 'fs/promises';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import { logger } from '../logger.service';

export interface ContentReaderResult {
  success: boolean;
  content: string;
  contentType: 'text' | 'csv' | 'json' | 'ocr';
  error?: string;
}

export class ContentReaderService {
  async getContent(filePath: string): Promise<ContentReaderResult> {
    logger.debug('content-reader', 'Starting content extraction', { filePath });
    
    try {
      const ext = path.extname(filePath).toLowerCase();
      
      switch (ext) {
        case '.txt':
        case '.md':
          return await this.readTextFile(filePath);
        
        case '.csv':
          return await this.readCSVFile(filePath);
        
        case '.xlsx':
        case '.xls':
          return await this.readExcelFile(filePath);
        
        case '.json':
          return await this.readJSONFile(filePath);
        
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.bmp':
        case '.tiff':
        case '.webp':
          return await this.readImageFile(filePath);
        
        case '.pdf':
          return await this.readPDFFile(filePath);
        
        default:
          // Try to read as text file
          return await this.readTextFile(filePath);
      }
    } catch (error) {
      logger.error('content-reader', 'Content extraction failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        content: '',
        contentType: 'text',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async readTextFile(filePath: string): Promise<ContentReaderResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      success: true,
      content,
      contentType: 'text'
    };
  }

  private async readCSVFile(filePath: string): Promise<ContentReaderResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      success: true,
      content,
      contentType: 'csv'
    };
  }

  private async readExcelFile(filePath: string): Promise<ContentReaderResult> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to CSV format for AI processing
    const csvContent = XLSX.utils.sheet_to_csv(sheet);
    
    return {
      success: true,
      content: csvContent,
      contentType: 'csv'
    };
  }

  private async readJSONFile(filePath: string): Promise<ContentReaderResult> {
    const content = await fs.readFile(filePath, 'utf-8');
    // Validate JSON and prettify for AI
    const jsonData = JSON.parse(content);
    const formattedContent = JSON.stringify(jsonData, null, 2);
    
    return {
      success: true,
      content: formattedContent,
      contentType: 'json'
    };
  }

  private async readImageFile(filePath: string): Promise<ContentReaderResult> {
    logger.debug('content-reader', 'Starting OCR processing for image');
    
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          logger.debug('content-reader', `OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Configure for better text recognition
    await worker.setParameters({
      tessedit_page_seg_mode: '6', // Uniform block of text
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.,$/: ()',
      preserve_interword_spaces: '1'
    });

    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();

    return {
      success: true,
      content: text,
      contentType: 'ocr'
    };
  }

  private async readPDFFile(filePath: string): Promise<ContentReaderResult> {
    // For now, return placeholder - PDF reading would require pdf-parse or similar
    logger.warn('content-reader', 'PDF reading not yet implemented, returning placeholder');
    return {
      success: false,
      content: '',
      contentType: 'text',
      error: 'PDF reading not yet implemented'
    };
  }
}