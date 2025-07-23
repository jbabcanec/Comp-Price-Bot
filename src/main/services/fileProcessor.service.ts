import * as fs from 'fs/promises';
import * as path from 'path';
import * as pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as mammoth from 'mammoth';
import { createWorker } from 'tesseract.js';
import { parse as parseHtml } from 'node-html-parser';
import * as yauzl from 'yauzl';
import { promisify } from 'util';
import { parseMsg, parseEml } from 'eml-parser';
import * as StreamZip from 'node-stream-zip';
import { OpenAIProductExtractor, OpenAIProductSchema } from '@shared/services/openai-extractor';
import { UniversalSpecDetector } from '@shared/utils/universalSpecDetector';

/**
 * Extracted data structure from any file type
 */
export interface ExtractedData {
  sku: string;
  company: string;
  price?: number;
  description?: string;
  model?: string;
  type?: string;
  source?: string;
  confidence?: number;
}

/**
 * File processing result with metadata
 */
export interface ProcessingResult {
  success: boolean;
  data: ExtractedData[];
  fileName: string;
  fileType: string;
  processingTime: number;
  error?: string;
  warnings?: string[];
  openaiResults?: OpenAIProductSchema; // Optional OpenAI enhanced results
  extractionMethod?: 'traditional' | 'openai' | 'hybrid';
}

/**
 * Universal file processor that can handle literally any file type
 * Uses multiple strategies for robust data extraction
 */
export class FileProcessorService {
  private ocrWorker: any;
  private openaiExtractor?: OpenAIProductExtractor;
  private useOpenAI: boolean = false;
  
  constructor(openaiApiKey?: string) {
    this.initializeOCR();
    if (openaiApiKey) {
      this.openaiExtractor = new OpenAIProductExtractor(openaiApiKey);
      this.useOpenAI = true;
    }
  }

  /**
   * Initialize OCR worker for image processing
   */
  private async initializeOCR(): Promise<void> {
    try {
      this.ocrWorker = await createWorker();
      await this.ocrWorker.loadLanguage('eng');
      await this.ocrWorker.initialize('eng');
    } catch (error: any) {
      console.warn('OCR initialization failed, image processing will be limited:', error);
    }
  }

  /**
   * Main entry point - processes any file type with optional OpenAI enhancement
   */
  async processFile(filePath: string, useOpenAI: boolean = this.useOpenAI): Promise<ProcessingResult> {
    const startTime = Date.now();
    const fileName = path.basename(filePath);
    const fileExtension = path.extname(filePath).toLowerCase();
    
    try {
      let result: ExtractedData[];
      
      // Route to appropriate processor based on file type
      switch (fileExtension) {
        // Spreadsheets
        case '.xlsx':
        case '.xls':
        case '.ods':
          result = await this.processSpreadsheet(filePath);
          break;
          
        case '.csv':
          result = await this.processCSV(filePath);
          break;
          
        // Documents  
        case '.pdf':
          result = await this.processPDF(filePath);
          break;
          
        case '.docx':
        case '.doc':
          result = await this.processWordDocument(filePath);
          break;
          
        case '.txt':
        case '.rtf':
          result = await this.processTextFile(filePath);
          break;
          
        // Images
        case '.jpg':
        case '.jpeg':
        case '.png':
        case '.bmp':
        case '.tiff':
        case '.webp':
          result = await this.processImage(filePath);
          break;
          
        // Email
        case '.msg':
          result = await this.processMSGFile(filePath);
          break;
          
        case '.eml':
          result = await this.processEMLFile(filePath);
          break;
          
        // Web/Data
        case '.html':
        case '.htm':
          result = await this.processHTML(filePath);
          break;
          
        case '.json':
          result = await this.processJSON(filePath);
          break;
          
        case '.xml':
          result = await this.processXML(filePath);
          break;
          
        // Archives
        case '.zip':
          result = await this.processZIP(filePath);
          break;
          
        // Default: attempt multiple strategies
        default:
          result = await this.processUnknownFile(filePath);
          break;
      }

      const processingTime = Date.now() - startTime;
      let openaiResults: OpenAIProductSchema | undefined;
      let extractionMethod: 'traditional' | 'openai' | 'hybrid' = 'traditional';
      
      // Enhance with OpenAI if available and requested
      if (useOpenAI && this.openaiExtractor && result.length > 0) {
        try {
          // Create combined text from all extractions for OpenAI processing
          const combinedText = this.createCombinedTextForOpenAI(result, filePath);
          if (combinedText.length > 100) {
            openaiResults = await this.openaiExtractor.extractProducts(combinedText);
            
            // Merge OpenAI results with traditional results
            const enhancedData = this.mergeTraditionalWithOpenAI(result, openaiResults);
            extractionMethod = enhancedData.length > result.length ? 'hybrid' : 'openai';
            result = enhancedData;
          }
        } catch (error) {
          console.warn('OpenAI enhancement failed, using traditional extraction:', error);
          // Continue with traditional results
        }
      }
      
      return {
        success: true,
        data: this.validateAndCleanData(result),
        fileName,
        fileType: fileExtension,
        processingTime,
        openaiResults,
        extractionMethod
      };
      
    } catch (error) {
      console.error(`Error processing file ${fileName}:`, error);
      
      return {
        success: false,
        data: [],
        fileName,
        fileType: fileExtension,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  /**
   * Process Excel/LibreOffice spreadsheets
   */
  private async processSpreadsheet(filePath: string): Promise<ExtractedData[]> {
    const buffer = await fs.readFile(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const results: ExtractedData[] = [];

    // Process all worksheets
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const sheetResults = this.extractFromTableData(jsonData as any[][], `Sheet: ${sheetName}`);
      results.push(...sheetResults);
    }

    return results;
  }

  /**
   * Process CSV files with robust parsing
   */
  private async processCSV(filePath: string): Promise<ExtractedData[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          try {
            const extractedData = this.extractFromTableData(result.data as string[][], 'CSV');
            resolve(extractedData);
          } catch (error) {
            reject(error);
          }
        },
        error: (error: any) => {
          reject(new Error(`CSV parsing failed: ${error.message}`));
        }
      });
    });
  }

  /**
   * Process PDF documents with text extraction
   */
  private async processPDF(filePath: string): Promise<ExtractedData[]> {
    const buffer = await fs.readFile(filePath);
    const pdfData = await pdfParse.default(buffer);
    
    return this.extractFromText(pdfData.text, 'PDF');
  }

  /**
   * Process Word documents
   */
  private async processWordDocument(filePath: string): Promise<ExtractedData[]> {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    
    return this.extractFromText(result.value, 'Word Document');
  }

  /**
   * Process plain text files
   */
  private async processTextFile(filePath: string): Promise<ExtractedData[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    return this.extractFromText(content, 'Text File');
  }

  /**
   * Process images using OCR
   */
  private async processImage(filePath: string): Promise<ExtractedData[]> {
    if (!this.ocrWorker) {
      throw new Error('OCR not available - image processing disabled');
    }

    try {
      const { data: { text } } = await this.ocrWorker.recognize(filePath);
      return this.extractFromText(text, 'Image OCR');
    } catch (error) {
      console.error('OCR processing failed:', error);
      return [];
    }
  }

  /**
   * Process MSG files (Outlook emails) - placeholder for now
   */
  private async processMSGFile(filePath: string): Promise<ExtractedData[]> {
    // TODO: Implement MSG parsing using msg-reader or similar
    // For now, treat as binary and attempt text extraction
    try {
      const buffer = await fs.readFile(filePath);
      const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
      return this.extractFromText(text, 'MSG Email');
    } catch {
      return [];
    }
  }

  /**
   * Process EML files (standard email format)
   */
  private async processEMLFile(filePath: string): Promise<ExtractedData[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    // Simple email parsing - extract body content
    const bodyMatch = content.match(/\n\n([\s\S]*?)$/);
    const bodyText = bodyMatch ? bodyMatch[1] : content;
    
    return this.extractFromText(bodyText, 'EML Email');
  }

  /**
   * Process HTML files
   */
  private async processHTML(filePath: string): Promise<ExtractedData[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const root = parseHtml(content);
    
    // Extract text content from HTML
    const textContent = root.text;
    
    // Also look for tables
    const tables = root.querySelectorAll('table');
    const results: ExtractedData[] = [];
    
    // Process tables
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      const tableData: string[][] = [];
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td, th');
        const rowData = cells.map(cell => cell.text.trim());
        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      }
      
      if (tableData.length > 0) {
        results.push(...this.extractFromTableData(tableData, 'HTML Table'));
      }
    }
    
    // Also extract from general text
    results.push(...this.extractFromText(textContent, 'HTML'));
    
    return results;
  }

  /**
   * Process JSON files
   */
  private async processJSON(filePath: string): Promise<ExtractedData[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    return this.extractFromStructuredData(data, 'JSON');
  }

  /**
   * Process XML files
   */
  private async processXML(filePath: string): Promise<ExtractedData[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    // Basic XML processing - extract text content
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    return this.extractFromText(textContent, 'XML');
  }

  /**
   * Process ZIP archives
   */
  private async processZIP(filePath: string): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];
    
    return new Promise((resolve, reject) => {
      yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        zipfile!.readEntry();
        
        zipfile!.on('entry', async (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile!.readEntry();
          } else {
            // File entry - extract and process
            zipfile!.openReadStream(entry, async (err, readStream) => {
              if (err) {
                zipfile!.readEntry();
                return;
              }

              try {
                const chunks: Buffer[] = [];
                readStream!.on('data', (chunk) => chunks.push(chunk));
                readStream!.on('end', async () => {
                  const buffer = Buffer.concat(chunks);
                  const tempPath = path.join(__dirname, 'temp_' + Date.now() + '_' + entry.fileName);
                  
                  try {
                    await fs.writeFile(tempPath, buffer);
                    const entryResults = await this.processFile(tempPath);
                    results.push(...entryResults.data);
                    await fs.unlink(tempPath); // Cleanup
                  } catch (error) {
                    console.warn(`Failed to process ZIP entry ${entry.fileName}:`, error);
                  }
                  
                  zipfile!.readEntry();
                });
              } catch (error) {
                console.warn(`Error processing ZIP entry ${entry.fileName}:`, error);
                zipfile!.readEntry();
              }
            });
          }
        });

        zipfile!.on('end', () => {
          resolve(results);
        });
      });
    });
  }

  /**
   * Process unknown file types using multiple strategies
   */
  private async processUnknownFile(filePath: string): Promise<ExtractedData[]> {
    const results: ExtractedData[] = [];
    
    try {
      // Try as text first
      const content = await fs.readFile(filePath, 'utf-8');
      results.push(...this.extractFromText(content, 'Unknown File (Text)'));
    } catch {
      // If text fails, try as binary with limited text extraction
      try {
        const buffer = await fs.readFile(filePath);
        const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 5000));
        results.push(...this.extractFromText(text, 'Unknown File (Binary)'));
      } catch {
        // Complete failure
        console.warn(`Unable to process file: ${filePath}`);
      }
    }
    
    return results;
  }

  /**
   * Extract structured data from table format (CSV, Excel, HTML tables)
   */
  private extractFromTableData(rows: string[][], source: string): ExtractedData[] {
    if (rows.length === 0) return [];
    
    const results: ExtractedData[] = [];
    const headers = rows[0].map(h => h?.toLowerCase()?.trim() || '');
    
    // Find column indices for important fields
    const skuIndex = this.findColumnIndex(headers, ['sku', 'part', 'model', 'item']);
    const companyIndex = this.findColumnIndex(headers, ['company', 'brand', 'manufacturer', 'vendor']);
    const priceIndex = this.findColumnIndex(headers, ['price', 'cost', 'msrp', 'list']);
    const descIndex = this.findColumnIndex(headers, ['description', 'desc', 'product', 'name']);

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const sku = skuIndex !== -1 ? row[skuIndex]?.trim() : '';
      const company = companyIndex !== -1 ? row[companyIndex]?.trim() : '';
      
      if (sku || company) {
        const extracted: ExtractedData = {
          sku: sku || 'UNKNOWN',
          company: company || 'UNKNOWN',
          source: source
        };
        
        if (priceIndex !== -1 && row[priceIndex]) {
          const priceStr = row[priceIndex].replace(/[^\d.,]/g, '');
          const price = parseFloat(priceStr);
          if (!isNaN(price)) {
            extracted.price = price;
          }
        }
        
        if (descIndex !== -1 && row[descIndex]) {
          extracted.description = row[descIndex].trim();
        }
        
        results.push(extracted);
      }
    }
    
    return results;
  }

  /**
   * Extract data from unstructured text using pattern matching
   */
  private extractFromText(text: string, source: string): ExtractedData[] {
    const results: ExtractedData[] = [];
    const lines = text.split('\n');
    
    // HVAC-specific patterns
    const skuPatterns = [
      /[A-Z]{2,}[-\s]?[A-Z0-9]{3,}/g,  // General SKU pattern
      /\b[A-Z]{3,}\d{3,}[A-Z]?\b/g,     // Brand + numbers pattern
      /\b\d{2}[A-Z]{2,}\d{3,}\b/g       // Number + letters + numbers
    ];
    
    const pricePatterns = [
      /\$[\d,]+\.?\d*/g,                // $1,234.56
      /[\d,]+\.?\d*\s*USD/gi,           // 1234.56 USD
      /price[:\s]+\$?[\d,]+\.?\d*/gi    // Price: $1234
    ];
    
    const companyPatterns = [
      /\b(trane|carrier|lennox|york|goodman|rheem|payne|bryant|day\s*&\s*night|comfortmaker|heil|tempstar|arcoaire|keeprite)\b/gi
    ];

    for (const line of lines) {
      if (line.trim().length < 10) continue; // Skip short lines
      
      // Look for SKU patterns
      const skuMatches = skuPatterns.flatMap(pattern => [...line.matchAll(pattern)]);
      const priceMatches = [...line.matchAll(pricePatterns[0])];
      const companyMatches = [...line.matchAll(companyPatterns[0])];
      
      if (skuMatches.length > 0) {
        const sku = skuMatches[0][0].trim();
        const company = companyMatches.length > 0 ? companyMatches[0][0].trim() : 'UNKNOWN';
        
        const extracted: ExtractedData = {
          sku,
          company,
          source,
          description: line.trim()
        };
        
        if (priceMatches.length > 0) {
          const priceStr = priceMatches[0][0].replace(/[^\d.]/g, '');
          const price = parseFloat(priceStr);
          if (!isNaN(price)) {
            extracted.price = price;
          }
        }
        
        results.push(extracted);
      }
    }
    
    return results;
  }

  /**
   * Extract data from structured objects (JSON, etc.)
   */
  private extractFromStructuredData(data: any, source: string): ExtractedData[] {
    const results: ExtractedData[] = [];
    
    const traverse = (obj: any, path = '') => {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
      } else if (typeof obj === 'object' && obj !== null) {
        // Look for SKU-like properties
        const sku = obj.sku || obj.SKU || obj.partNumber || obj.model || obj.itemNumber;
        const company = obj.company || obj.brand || obj.manufacturer || obj.vendor;
        const price = obj.price || obj.cost || obj.msrp || obj.listPrice;
        
        if (sku || company) {
          const extracted: ExtractedData = {
            sku: sku?.toString() || 'UNKNOWN',
            company: company?.toString() || 'UNKNOWN',
            source: `${source} (${path})`
          };
          
          if (price && !isNaN(parseFloat(price))) {
            extracted.price = parseFloat(price);
          }
          
          if (obj.description) {
            extracted.description = obj.description.toString();
          }
          
          results.push(extracted);
        }
        
        // Recursively traverse nested objects
        Object.keys(obj).forEach(key => {
          traverse(obj[key], path ? `${path}.${key}` : key);
        });
      }
    };
    
    traverse(data);
    return results;
  }

  /**
   * Find column index by matching against possible header names
   */
  private findColumnIndex(headers: string[], possibilities: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (possibilities.some(p => header.includes(p))) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Validate and clean extracted data
   */
  private validateAndCleanData(data: ExtractedData[]): ExtractedData[] {
    return data
      .filter(item => item.sku && item.sku !== 'UNKNOWN' && item.sku.length >= 3)
      .map(item => ({
        ...item,
        sku: item.sku.trim().toUpperCase(),
        company: item.company?.trim() || 'UNKNOWN',
        price: item.price && item.price > 0 ? Math.round(item.price * 100) / 100 : undefined,
        description: item.description?.trim().substring(0, 500) || undefined,
        confidence: this.calculateConfidence(item)
      }))
      .slice(0, 1000); // Limit results to prevent memory issues
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(item: ExtractedData): number {
    let confidence = 0.5; // Base confidence
    
    // SKU quality
    if (item.sku && item.sku.length >= 5 && /[A-Z]/.test(item.sku) && /\d/.test(item.sku)) {
      confidence += 0.2;
    }
    
    // Company detection
    if (item.company && item.company !== 'UNKNOWN') {
      confidence += 0.1;
    }
    
    // Price presence
    if (item.price && item.price > 0) {
      confidence += 0.1;
    }
    
    // Description quality
    if (item.description && item.description.length > 20) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Create combined text from traditional extraction results for OpenAI processing
   */
  private createCombinedTextForOpenAI(extractedData: ExtractedData[], filePath: string): string {
    const sections = [];
    sections.push(`File: ${path.basename(filePath)}`);
    sections.push('Extracted Products:');
    
    for (const item of extractedData) {
      const productText = [
        `SKU: ${item.sku}`,
        item.company !== 'UNKNOWN' ? `Brand: ${item.company}` : '',
        item.model ? `Model: ${item.model}` : '',
        item.description ? `Description: ${item.description}` : '',
        item.price ? `Price: $${item.price}` : '',
        item.type ? `Type: ${item.type}` : ''
      ].filter(Boolean).join(' | ');
      
      sections.push(productText);
    }
    
    return sections.join('\n');
  }

  /**
   * Merge traditional extraction results with OpenAI enhanced results
   */
  private mergeTraditionalWithOpenAI(traditional: ExtractedData[], openaiResults: OpenAIProductSchema): ExtractedData[] {
    const merged: ExtractedData[] = [...traditional];
    
    // Convert OpenAI results to ExtractedData format and add unique products
    for (const product of openaiResults.products) {
      const existingSku = merged.find(item => 
        item.sku.toUpperCase() === product.sku.toUpperCase()
      );
      
      if (!existingSku) {
        // Add new product found by OpenAI
        const extractedData: ExtractedData = {
          sku: product.sku,
          company: product.brand || product.manufacturer || 'UNKNOWN',
          model: product.model,
          description: product.description,
          price: product.price?.value,
          type: product.product_type,
          source: 'OpenAI Enhanced',
          confidence: product.confidence
        };
        
        merged.push(extractedData);
      } else {
        // Enhance existing product with OpenAI data
        if (!existingSku.model && product.model) {
          existingSku.model = product.model;
        }
        if (!existingSku.description && product.description) {
          existingSku.description = product.description;
        }
        if (!existingSku.price && product.price?.value) {
          existingSku.price = product.price.value;
        }
        if (!existingSku.type && product.product_type) {
          existingSku.type = product.product_type;
        }
        // Boost confidence for OpenAI-enhanced products
        existingSku.confidence = Math.max(existingSku.confidence || 0.5, product.confidence);
      }
    }
    
    return merged;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
    }
  }
}