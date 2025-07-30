/**
 * Standardized Input Parser Service
 * 
 * Validates, sanitizes, and normalizes ALL incoming competitor data before processing
 * Ensures consistent format regardless of source (email, file upload, manual entry)
 * Matches the standardized output approach for complete data integrity
 */

import { createHash } from 'crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { logger } from './logger.service';
import { CompetitorProduct } from '@shared/types/matching.types';

/**
 * Raw input formats from different sources
 */
export interface RawEmailInput {
  readonly sender: string;
  readonly subject: string;
  readonly body: string;
  readonly attachments?: ReadonlyArray<{
    readonly name: string;
    readonly type: string;
    readonly content: string;
  }>;
  readonly timestamp: string;
}

export interface RawFileInput {
  readonly filename: string;
  readonly fileType: 'csv' | 'xlsx' | 'json' | 'xml' | 'pdf';
  readonly content: string | Buffer;
  readonly headers?: readonly string[];
  readonly uploadedAt: string;
}

export interface RawManualInput {
  readonly competitors: ReadonlyArray<Record<string, any>>;
  readonly source: string;
  readonly enteredBy: string;
  readonly enteredAt: string;
}

/**
 * Standardized input format after parsing
 */
export interface StandardizedInput {
  readonly requestId: string;
  readonly source: InputSource;
  readonly sourceMetadata: SourceMetadata;
  readonly competitors: ReadonlyArray<CompetitorProduct>;
  readonly validation: {
    readonly isValid: boolean;
    readonly totalItems: number;
    readonly validItems: number;
    readonly errors: ReadonlyArray<ParseError>;
    readonly warnings: ReadonlyArray<string>;
    readonly qualityScore: number; // 0.0 - 1.0
  };
  readonly processing: {
    readonly parsedAt: string;
    readonly processingTimeMs: number;
    readonly parsingMethod: ParsingMethod;
    readonly confidence: number;
  };
}

export type InputSource = 'email' | 'file_upload' | 'manual_entry' | 'api' | 'batch_import';
export type ParsingMethod = 'email_ai' | 'csv_structured' | 'xlsx_structured' | 'json_direct' | 'manual_form' | 'pdf_extraction' | 'xml_structured';

export interface SourceMetadata {
  readonly originalSource: string;
  readonly filename?: string;
  readonly sender?: string;
  readonly uploadedBy?: string;
  readonly contentHash: string;
  readonly size: number;
  readonly encoding?: string;
}

export interface ParseError {
  readonly row?: number;
  readonly field?: string;
  readonly value?: any;
  readonly errorCode: string;
  readonly message: string;
  readonly severity: 'error' | 'warning' | 'info';
}

/**
 * Parser configuration
 */
export interface ParserConfig {
  readonly strictValidation: boolean;
  readonly requireAllFields: boolean;
  readonly autoCorrectValues: boolean;
  readonly maxItemsPerBatch: number;
  readonly enableAIFallback: boolean;
  readonly confidenceThreshold: number;
}

/**
 * JSON Schema for competitor validation
 */
const COMPETITOR_INPUT_SCHEMA = {
  type: 'object',
  required: ['sku', 'company'],
  properties: {
    sku: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 100,
      pattern: '^[A-Za-z0-9-_./\\s]+$' 
    },
    company: { 
      type: 'string', 
      minLength: 1, 
      maxLength: 100 
    },
    model: { 
      type: 'string', 
      maxLength: 100 
    },
    price: { 
      type: 'number', 
      minimum: 0, 
      maximum: 1000000 
    },
    specifications: {
      type: 'object',
      properties: {
        tonnage: { type: 'number', minimum: 0.5, maximum: 25 },
        seer: { type: 'number', minimum: 8, maximum: 35 },
        eer: { type: 'number', minimum: 8, maximum: 20 },
        afue: { type: 'number', minimum: 80, maximum: 100 },
        hspf: { type: 'number', minimum: 6, maximum: 15 },
        cop: { type: 'number', minimum: 1, maximum: 6 },
        refrigerant: { type: 'string', maxLength: 20 },
        voltage: { type: 'number', minimum: 110, maximum: 480 },
        phase: { type: 'number', enum: [1, 3] },
        product_type: { type: 'string', maxLength: 50 },
        type: { enum: ['AC', 'Heat Pump', 'Furnace', 'Air Handler', 'Package Unit', 'Other'] },
        application: { enum: ['residential', 'commercial', 'industrial'] },
        features: {
          type: 'array',
          items: { type: 'string', maxLength: 100 },
          maxItems: 20
        }
      },
      additionalProperties: true // Allow extra specs
    }
  },
  additionalProperties: true // Allow extra fields initially
} as const;

export class StandardizedInputParserService {
  private readonly ajv: Ajv;
  private readonly validator: any;
  private readonly config: ParserConfig;

  constructor(config: Partial<ParserConfig> = {}) {
    this.config = {
      strictValidation: true,
      requireAllFields: false,
      autoCorrectValues: true,
      maxItemsPerBatch: 1000,
      enableAIFallback: true,
      confidenceThreshold: 0.8,
      ...config
    };

    // Initialize JSON schema validator
    this.ajv = new Ajv({ 
      allErrors: true, 
      strict: false,
      removeAdditional: 'failing', // Remove invalid properties
      coerceTypes: true // Auto-convert compatible types
    });
    addFormats(this.ajv);
    
    this.validator = this.ajv.compile(COMPETITOR_INPUT_SCHEMA);

    logger.info('input-parser', 'Standardized input parser initialized', {
      strictValidation: this.config.strictValidation,
      maxItems: this.config.maxItemsPerBatch
    });
  }

  /**
   * Parse email input using AI extraction
   */
  async parseEmailInput(emailData: RawEmailInput): Promise<StandardizedInput> {
    const startTime = performance.now();
    const requestId = this.generateRequestId('email');

    logger.info('input-parser', 'Parsing email input', {
      requestId,
      sender: emailData.sender,
      hasAttachments: !!emailData.attachments?.length
    });

    try {
      // Extract competitors from email content using AI
      const competitors = await this.extractCompetitorsFromEmail(emailData);
      
      return this.createStandardizedInput({
        requestId,
        source: 'email',
        sourceMetadata: {
          originalSource: emailData.sender,
          sender: emailData.sender,
          contentHash: this.generateContentHash(emailData.body),
          size: emailData.body.length,
          encoding: 'utf-8'
        },
        competitors,
        parsingMethod: 'email_ai',
        processingTimeMs: performance.now() - startTime
      });

    } catch (error) {
      logger.error('input-parser', 'Email parsing failed', error as Error, { requestId });
      return this.createErrorResult(requestId, 'email', error as Error, startTime);
    }
  }

  /**
   * Parse structured file input (CSV, XLSX, JSON)
   */
  async parseFileInput(fileData: RawFileInput): Promise<StandardizedInput> {
    const startTime = performance.now();
    const requestId = this.generateRequestId('file');

    logger.info('input-parser', 'Parsing file input', {
      requestId,
      filename: fileData.filename,
      fileType: fileData.fileType
    });

    try {
      let competitors: CompetitorProduct[] = [];

      switch (fileData.fileType) {
        case 'csv':
          competitors = await this.parseCsvContent(fileData.content as string, fileData.headers);
          break;
        case 'xlsx':
          competitors = await this.parseExcelContent(fileData.content as Buffer);
          break;
        case 'json':
          competitors = await this.parseJsonContent(fileData.content as string);
          break;
        case 'xml':
          competitors = await this.parseXmlContent(fileData.content as string);
          break;
        case 'pdf':
          competitors = await this.parsePdfContent(fileData.content as Buffer);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileData.fileType}`);
      }

      return this.createStandardizedInput({
        requestId,
        source: 'file_upload',
        sourceMetadata: {
          originalSource: fileData.filename,
          filename: fileData.filename,
          contentHash: this.generateContentHash(fileData.content),
          size: Buffer.isBuffer(fileData.content) ? fileData.content.length : fileData.content.length,
          encoding: 'utf-8'
        },
        competitors,
        parsingMethod: this.getFileParsingMethod(fileData.fileType),
        processingTimeMs: performance.now() - startTime
      });

    } catch (error) {
      logger.error('input-parser', 'File parsing failed', error as Error, { 
        requestId, 
        filename: fileData.filename 
      });
      return this.createErrorResult(requestId, 'file_upload', error as Error, startTime);
    }
  }

  /**
   * Parse manual input from forms
   */
  async parseManualInput(manualData: RawManualInput): Promise<StandardizedInput> {
    const startTime = performance.now();
    const requestId = this.generateRequestId('manual');

    logger.info('input-parser', 'Parsing manual input', {
      requestId,
      itemCount: manualData.competitors.length,
      enteredBy: manualData.enteredBy
    });

    try {
      const competitors = await this.validateAndNormalizeCompetitors(
        manualData.competitors.map(this.normalizeManualCompetitor)
      );

      return this.createStandardizedInput({
        requestId,
        source: 'manual_entry',
        sourceMetadata: {
          originalSource: manualData.source,
          uploadedBy: manualData.enteredBy,
          contentHash: this.generateContentHash(JSON.stringify(manualData.competitors)),
          size: JSON.stringify(manualData.competitors).length
        },
        competitors,
        parsingMethod: 'manual_form',
        processingTimeMs: performance.now() - startTime
      });

    } catch (error) {
      logger.error('input-parser', 'Manual parsing failed', error as Error, { requestId });
      return this.createErrorResult(requestId, 'manual_entry', error as Error, startTime);
    }
  }

  /**
   * Validate parsed input against business rules
   */
  validateInput(input: StandardizedInput): {
    isValid: boolean;
    errors: readonly string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 1.0;

    // Check minimum requirements
    if (input.competitors.length === 0) {
      errors.push('No competitors found in input');
      score = 0;
    }

    // Check data quality
    const validCompetitors = input.competitors.filter(c => c.sku && c.company);
    const qualityRatio = validCompetitors.length / input.competitors.length;
    
    if (qualityRatio < 0.8) {
      errors.push('Data quality below threshold (80% valid items required)');
      score *= qualityRatio;
    }

    // Check for duplicates
    const skuSet = new Set(input.competitors.map(c => `${c.sku}_${c.company}`.toLowerCase()));
    if (skuSet.size < input.competitors.length) {
      errors.push('Duplicate competitors detected');
      score *= 0.9;
    }

    // Check confidence threshold
    if (input.processing.confidence < this.config.confidenceThreshold) {
      errors.push(`Parsing confidence below threshold (${this.config.confidenceThreshold})`);
      score *= input.processing.confidence;
    }

    return {
      isValid: errors.length === 0 && score >= this.config.confidenceThreshold,
      errors,
      score
    };
  }

  // Private implementation methods

  private async extractCompetitorsFromEmail(emailData: RawEmailInput): Promise<CompetitorProduct[]> {
    // This would use the existing OpenAI extractor with email-specific prompts
    // For now, return placeholder implementation
    const content = `${emailData.subject}\n${emailData.body}`;
    
    // Use AI to extract structured data from email
    // This would integrate with the existing OpenAI service
    return this.parseUnstructuredText(content);
  }

  private async parseCsvContent(content: string, headers?: readonly string[]): Promise<CompetitorProduct[]> {
    const lines = content.trim().split('\n');
    const headerLine = headers ? headers.join(',') : lines[0];
    const dataLines = headers ? lines : lines.slice(1);

    const headerMapping = this.createHeaderMapping(headerLine.split(','));
    const competitors: CompetitorProduct[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const values = this.parseCsvLine(dataLines[i]);
        const competitor = this.mapCsvRowToCompetitor(values, headerMapping, i + 1);
        if (competitor) competitors.push(competitor);
      } catch (error) {
        logger.warn('input-parser', `Failed to parse CSV row ${i + 1}`, { error });
      }
    }

    return competitors;
  }

  private async parseExcelContent(content: Buffer): Promise<CompetitorProduct[]> {
    // Would use a library like xlsx to parse Excel files
    // Placeholder implementation
    throw new Error('Excel parsing not yet implemented');
  }

  private async parseJsonContent(content: string): Promise<CompetitorProduct[]> {
    try {
      const data = JSON.parse(content);
      
      // Handle different JSON structures
      if (Array.isArray(data)) {
        return this.validateAndNormalizeCompetitors(data);
      } else if (data.competitors && Array.isArray(data.competitors)) {
        return this.validateAndNormalizeCompetitors(data.competitors);
      } else if (data.products && Array.isArray(data.products)) {
        return this.validateAndNormalizeCompetitors(data.products);
      } else {
        throw new Error('JSON structure not recognized');
      }
    } catch (error) {
      throw new Error(`Invalid JSON format: ${(error as Error).message}`);
    }
  }

  private async parseXmlContent(content: string): Promise<CompetitorProduct[]> {
    // Would use XML parser library
    // Placeholder implementation
    throw new Error('XML parsing not yet implemented');
  }

  private async parsePdfContent(content: Buffer): Promise<CompetitorProduct[]> {
    // Would use PDF parsing library + AI extraction
    // Placeholder implementation
    throw new Error('PDF parsing not yet implemented');
  }

  private async parseUnstructuredText(text: string): Promise<CompetitorProduct[]> {
    // Placeholder for AI-powered text extraction
    // This would integrate with the existing OpenAI service
    const mockCompetitors: CompetitorProduct[] = [];
    
    // Extract patterns that look like product information
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    for (const line of lines) {
      const competitor = this.extractCompetitorFromLine(line);
      if (competitor) mockCompetitors.push(competitor);
    }

    return mockCompetitors;
  }

  private extractCompetitorFromLine(line: string): CompetitorProduct | null {
    // Simple pattern matching for demonstration
    // In production, this would use sophisticated AI parsing
    const patterns = [
      /(\w+[-\w]*)\s+([A-Z]{2,})\s*[\$]?(\d+\.?\d*)/i, // SKU COMPANY PRICE
      /([A-Z]{2,})\s+(\w+[-\w]*)\s*[\$]?(\d+\.?\d*)/i  // COMPANY SKU PRICE
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return {
          sku: match[1].trim(),
          company: match[2].trim(),
          price: match[3] ? parseFloat(match[3]) : undefined,
          specifications: {}
        };
      }
    }

    return null;
  }

  private async validateAndNormalizeCompetitors(rawCompetitors: any[]): Promise<CompetitorProduct[]> {
    const competitors: CompetitorProduct[] = [];
    
    for (let i = 0; i < rawCompetitors.length; i++) {
      const raw = rawCompetitors[i];
      
      try {
        const normalized = this.normalizeCompetitor(raw);
        
        if (this.validator(normalized)) {
          competitors.push(normalized);
        } else {
          logger.warn('input-parser', `Competitor validation failed at index ${i}`, {
            errors: this.validator.errors,
            data: raw
          });
        }
      } catch (error) {
        logger.warn('input-parser', `Failed to normalize competitor at index ${i}`, { error });
      }
    }

    return competitors;
  }

  private normalizeCompetitor(raw: any): CompetitorProduct {
    return {
      sku: this.normalizeString(raw.sku || raw.SKU || raw.partNumber || raw.part_number),
      company: this.normalizeString(raw.company || raw.manufacturer || raw.brand),
      model: this.normalizeString(raw.model || raw.modelNumber || raw.model_number),
      price: this.normalizePrice(raw.price || raw.cost || raw.msrp),
      specifications: this.normalizeSpecifications(raw.specifications || raw.specs || raw)
    };
  }

  private normalizeManualCompetitor = (raw: any): CompetitorProduct => {
    return this.normalizeCompetitor(raw);
  };

  private normalizeString(value: any): string {
    if (typeof value === 'string') return value.trim().toUpperCase();
    if (typeof value === 'number') return value.toString();
    return '';
  }

  private normalizePrice(value: any): number | undefined {
    if (typeof value === 'number') return Math.max(0, value);
    if (typeof value === 'string') {
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? undefined : Math.max(0, parsed);
    }
    return undefined;
  }

  private normalizeSpecifications(raw: any): Record<string, any> {
    if (!raw || typeof raw !== 'object') return {};

    const specs: Record<string, any> = {};

    // Normalize common specification fields
    if (raw.tonnage || raw.tons) {
      specs.tonnage = this.parseNumeric(raw.tonnage || raw.tons);
    }
    if (raw.seer || raw.SEER) {
      specs.seer = this.parseNumeric(raw.seer || raw.SEER);
    }
    if (raw.eer || raw.EER) {
      specs.eer = this.parseNumeric(raw.eer || raw.EER);
    }
    if (raw.afue || raw.AFUE) {
      specs.afue = this.parseNumeric(raw.afue || raw.AFUE);
    }
    if (raw.hspf || raw.HSPF) {
      specs.hspf = this.parseNumeric(raw.hspf || raw.HSPF);
    }
    if (raw.refrigerant) {
      specs.refrigerant = this.normalizeString(raw.refrigerant);
    }
    if (raw.type || raw.product_type || raw.productType) {
      specs.type = this.normalizeProductType(raw.type || raw.product_type || raw.productType);
    }

    return specs;
  }

  private parseNumeric(value: any): number | undefined {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  private normalizeProductType(value: any): string | undefined {
    if (!value) return undefined;
    
    const normalized = value.toString().toLowerCase();
    if (normalized.includes('heat pump') || normalized.includes('hp')) return 'Heat Pump';
    if (normalized.includes('furnace') || normalized.includes('furnac')) return 'Furnace';
    if (normalized.includes('air handler') || normalized.includes('ah')) return 'Air Handler';
    if (normalized.includes('package') || normalized.includes('pkg')) return 'Package Unit';
    if (normalized.includes('ac') || normalized.includes('air con')) return 'AC';
    
    return 'Other';
  }

  private createHeaderMapping(headers: string[]): Record<string, number> {
    const mapping: Record<string, number> = {};
    
    headers.forEach((header, index) => {
      const normalized = header.toLowerCase().trim();
      
      // Map common header variations
      if (normalized.includes('sku') || normalized.includes('part')) {
        mapping.sku = index;
      } else if (normalized.includes('company') || normalized.includes('manufacturer') || normalized.includes('brand')) {
        mapping.company = index;
      } else if (normalized.includes('model')) {
        mapping.model = index;
      } else if (normalized.includes('price') || normalized.includes('cost') || normalized.includes('msrp')) {
        mapping.price = index;
      } else if (normalized.includes('tonnage') || normalized.includes('tons')) {
        mapping.tonnage = index;
      } else if (normalized.includes('seer')) {
        mapping.seer = index;
      } else if (normalized.includes('afue')) {
        mapping.afue = index;
      }
    });

    return mapping;
  }

  private mapCsvRowToCompetitor(values: string[], mapping: Record<string, number>, rowIndex: number): CompetitorProduct | null {
    try {
      const sku = values[mapping.sku || 0]?.trim();
      const company = values[mapping.company || 1]?.trim();

      if (!sku || !company) {
        logger.warn('input-parser', `Missing required fields in CSV row ${rowIndex}`);
        return null;
      }

      const competitor: CompetitorProduct = {
        sku,
        company,
        model: values[mapping.model]?.trim(),
        price: mapping.price !== undefined ? this.normalizePrice(values[mapping.price]) : undefined,
        specifications: {}
      };

      // Add specifications if available
      if (mapping.tonnage !== undefined) {
        competitor.specifications!.tonnage = this.parseNumeric(values[mapping.tonnage]);
      }
      if (mapping.seer !== undefined) {
        competitor.specifications!.seer = this.parseNumeric(values[mapping.seer]);
      }
      if (mapping.afue !== undefined) {
        competitor.specifications!.afue = this.parseNumeric(values[mapping.afue]);
      }

      return competitor;
    } catch (error) {
      logger.warn('input-parser', `Failed to map CSV row ${rowIndex}`, { error });
      return null;
    }
  }

  private parseCsvLine(line: string): string[] {
    // Simple CSV parsing - would use proper CSV library in production
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  private getFileParsingMethod(fileType: string): ParsingMethod {
    switch (fileType) {
      case 'csv': return 'csv_structured';
      case 'xlsx': return 'xlsx_structured';
      case 'json': return 'json_direct';
      case 'xml': return 'xml_structured';
      case 'pdf': return 'pdf_extraction';
      default: return 'manual_form';
    }
  }

  private createStandardizedInput(params: {
    requestId: string;
    source: InputSource;
    sourceMetadata: SourceMetadata;
    competitors: CompetitorProduct[];
    parsingMethod: ParsingMethod;
    processingTimeMs: number;
  }): StandardizedInput {
    const { requestId, source, sourceMetadata, competitors, parsingMethod, processingTimeMs } = params;
    
    const errors: ParseError[] = [];
    const warnings: string[] = [];
    
    // Calculate validation metrics
    const totalItems = competitors.length;
    const validItems = competitors.filter(c => c.sku && c.company).length;
    const qualityScore = totalItems > 0 ? validItems / totalItems : 0;
    const confidence = Math.min(qualityScore, 1.0);

    // Generate warnings for data quality issues
    if (qualityScore < 1.0) {
      warnings.push(`${totalItems - validItems} items missing required fields`);
    }

    return {
      requestId,
      source,
      sourceMetadata,
      competitors,
      validation: {
        isValid: validItems > 0 && qualityScore >= 0.5,
        totalItems,
        validItems,
        errors,
        warnings,
        qualityScore
      },
      processing: {
        parsedAt: new Date().toISOString(),
        processingTimeMs,
        parsingMethod,
        confidence
      }
    };
  }

  private createErrorResult(
    requestId: string, 
    source: InputSource, 
    error: Error, 
    startTime: number
  ): StandardizedInput {
    return {
      requestId,
      source,
      sourceMetadata: {
        originalSource: 'error',
        contentHash: '',
        size: 0
      },
      competitors: [],
      validation: {
        isValid: false,
        totalItems: 0,
        validItems: 0,
        errors: [{
          errorCode: 'PARSING_FAILED',
          message: error.message,
          severity: 'error'
        }],
        warnings: [],
        qualityScore: 0
      },
      processing: {
        parsedAt: new Date().toISOString(),
        processingTimeMs: performance.now() - startTime,
        parsingMethod: 'manual_form',
        confidence: 0
      }
    };
  }

  private generateRequestId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }

  private generateContentHash(content: string | Buffer): string {
    return createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }
}