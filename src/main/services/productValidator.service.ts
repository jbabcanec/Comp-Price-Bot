import { ExtractedData } from '@shared/types/product.types';
import { UniversalSpecDetector, UniversalProductData, UniversalSpec } from '@shared/utils/universalSpecDetector';

/**
 * Universal product validation result - supports ANY HVAC product
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  cleanedProduct?: UniversalProduct;
}

/**
 * Universal product data structure - completely flexible
 */
export interface UniversalProduct {
  // Core identifiers
  sku: string;
  model: string;
  brand: string;
  
  // Dynamic product classification
  primaryType: string;
  subTypes: string[];
  category?: string;
  subcategory?: string;
  
  // Universal specifications - no hardcoding
  specifications: Record<string, any>;
  
  // Standard fields
  description?: string;
  msrp?: number;
  created_at?: string;
  updated_at?: string;
  
  // Confidence and metadata
  confidence: number;
  source: string;
  detectedPatterns: string[];
}

/**
 * Universal bulk import summary
 */
export interface ImportSummary {
  totalProcessed: number;
  validProducts: number;
  invalidProducts: number;
  duplicateSkus: number;
  warnings: number;
  products: UniversalProduct[];
  errors: Array<{
    row: number;
    sku: string;
    errors: string[];
  }>;
  
  // Additional insights
  detectedTypes: Record<string, number>;
  detectedBrands: Record<string, number>;
  specificationCoverage: Record<string, number>;
}

/**
 * UNIVERSAL Product Validation Service
 * Supports ANY HVAC product type - no hardcoding, completely adaptive
 */
export class ProductValidatorService {

  /**
   * Simplified validation for structured price book data (CSV/Excel)
   * Since this is our own price book, we trust the data structure
   */
  validateStructuredProduct(data: ExtractedData, rowNumber?: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Minimal validation - just need SKU
    if (!data.sku || data.sku.trim().length === 0) {
      errors.push('SKU is required');
    }
    
    // Extract basic product info from structured data
    const cleanedProduct: UniversalProduct = {
      sku: (data.sku || '').trim(),
      model: (data.model || data.sku || '').trim(),
      brand: (data.company || 'Unknown').trim(),
      
      // For structured data, use type directly or infer from description
      primaryType: this.mapToDbType(data.type || this.inferTypeFromDescription(data.description || '')),
      subTypes: [],
      
      // Direct mapping of specifications
      specifications: this.extractStructuredSpecs(data),
      
      description: data.description,
      msrp: data.price ? Math.round(data.price * 100) / 100 : undefined,
      
      // High confidence for structured data
      confidence: 0.95,
      source: 'structured_import',
      detectedPatterns: ['price_book_import']
    };
    
    // Only fail if we have critical errors
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanedProduct: errors.length === 0 ? cleanedProduct : undefined
    };
  }

  /**
   * Extract specifications from structured data
   */
  private extractStructuredSpecs(data: ExtractedData): Record<string, any> {
    const specs: Record<string, any> = {};
    
    // Map common HVAC specifications if present in the data
    const specMappings = {
      'tonnage': ['tonnage', 'tons', 'ton', 'capacity'],
      'seer': ['seer', 'seer rating', 'efficiency'],
      'seer2': ['seer2', 'seer 2'],
      'hspf': ['hspf', 'heating efficiency'],
      'afue': ['afue', 'afue%', 'furnace efficiency'],
      'btuh': ['btuh', 'btu/h', 'btu', 'capacity'],
      'cfm': ['cfm', 'airflow'],
      'stages': ['stages', 'stage', 'speed'],
      'refrigerant': ['refrigerant', 'ref type'],
      'voltage': ['voltage', 'volts', 'v'],
      'phase': ['phase', 'ph'],
      'weight': ['weight', 'lbs', 'pounds']
    };
    
    // Check each field in the data for specification values
    for (const [specKey, aliases] of Object.entries(specMappings)) {
      for (const [dataKey, dataValue] of Object.entries(data)) {
        if (dataValue && aliases.some(alias => dataKey.toLowerCase().includes(alias))) {
          specs[specKey] = this.normalizeSpecValue(dataValue);
          break;
        }
      }
    }
    
    // Also preserve any additional fields that might be specifications
    for (const [key, value] of Object.entries(data)) {
      if (value && 
          !['sku', 'model', 'company', 'description', 'price', 'type'].includes(key.toLowerCase()) &&
          !specs[key]) {
        specs[key] = value;
      }
    }
    
    return specs;
  }

  /**
   * Normalize specification values
   */
  private normalizeSpecValue(value: any): any {
    if (typeof value === 'string') {
      // Try to extract numeric values
      const numMatch = value.match(/[\d.]+/);
      if (numMatch) {
        const num = parseFloat(numMatch[0]);
        if (!isNaN(num)) return num;
      }
    }
    return value;
  }

  /**
   * Infer product type from description for structured data
   */
  private inferTypeFromDescription(description: string): string {
    const desc = description.toLowerCase();
    
    if (desc.includes('furnace')) return 'furnace';
    if (desc.includes('heat pump')) return 'heat-pump';
    if (desc.includes('air condition') || desc.includes('ac unit')) return 'air-conditioner';
    if (desc.includes('air handler') || desc.includes('ahu')) return 'ahu';
    if (desc.includes('coil')) return 'coil';
    if (desc.includes('thermostat')) return 'control';
    
    return 'hvac-equipment';
  }

  /**
   * Universal product validation - completely dynamic
   */
  validateProduct(data: ExtractedData, rowNumber?: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Create text for universal analysis
    const analysisText = this.createAnalysisText(data);
    
    // Use universal spec detector for deep analysis
    const universalData = UniversalSpecDetector.extractUniversalSpecs(analysisText, 'validation');
    
    // Basic validation - only require core identifiers
    if (!universalData.sku || universalData.sku.length < 2) {
      errors.push('Product identifier (SKU/Model) is required');
    }
    
    if (!universalData.brand && universalData.classification.primaryType === 'unknown') {
      errors.push('Either brand/manufacturer or recognizable product type is required');
    }
    
    // Confidence-based warnings
    if (universalData.confidence < 0.3) {
      warnings.push('Low confidence in product data extraction - consider manual review');
    }
    
    if (universalData.classification.confidence < 0.2) {
      warnings.push('Could not clearly identify product type - classified as: ' + universalData.classification.primaryType);
    }
    
    // Price validation with intelligent ranges
    if (data.price !== undefined) {
      const priceValidation = this.validatePrice(data.price, universalData.classification.primaryType);
      warnings.push(...priceValidation.warnings);
      if (priceValidation.error) {
        errors.push(priceValidation.error);
      }
    }
    
    // Create universal product if validation passes
    if (errors.length === 0) {
      const cleanedProduct: UniversalProduct = {
        sku: universalData.sku || this.generateFallbackSKU(data),
        model: universalData.model || universalData.sku || 'Unknown',
        brand: universalData.brand || this.extractFallbackBrand(data) || 'Unknown',
        primaryType: this.mapToDbType(universalData.classification.primaryType),
        subTypes: universalData.classification.subTypes,
        specifications: this.normalizeSpecifications(universalData.specifications),
        description: universalData.description,
        msrp: data.price ? Math.round(data.price * 100) / 100 : undefined,
        confidence: universalData.confidence,
        source: universalData.source,
        detectedPatterns: universalData.classification.detectedPatterns
      };
      
      return {
        isValid: true,
        errors,
        warnings,
        cleanedProduct
      };
    }
    
    return {
      isValid: false,
      errors,
      warnings
    };
  }

  /**
   * Process bulk import of products
   */
  async processBulkImport(extractedData: ExtractedData[]): Promise<ImportSummary> {
    const summary: ImportSummary = {
      totalProcessed: extractedData.length,
      validProducts: 0,
      invalidProducts: 0,
      duplicateSkus: 0,
      warnings: 0,
      products: [],
      errors: [],
      detectedTypes: {},
      detectedBrands: {},
      specificationCoverage: {}
    };

    const seenSkus = new Set<string>();
    
    for (let i = 0; i < extractedData.length; i++) {
      const data = extractedData[i];
      
      // For structured data (has company field = our price book), use simplified validation
      if (data.company || data.sku) {
        const result = this.validateStructuredProduct(data, i + 1);
        
        if (result.isValid && result.cleanedProduct) {
          // Check for duplicate SKUs
          if (seenSkus.has(result.cleanedProduct.sku)) {
            summary.duplicateSkus++;
            summary.errors.push({
              row: i + 1,
              sku: result.cleanedProduct.sku,
              errors: ['Duplicate SKU found in import']
            });
          } else {
            seenSkus.add(result.cleanedProduct.sku);
            summary.products.push(result.cleanedProduct);
            summary.validProducts++;
          }
          
          summary.warnings += result.warnings.length;
        } else {
          summary.invalidProducts++;
          summary.errors.push({
            row: i + 1,
            sku: data.sku || 'Unknown',
            errors: result.errors
          });
        }
      } else {
        // For unstructured data (competitor files), use full AI validation
        const result = this.validateProduct(data, i + 1);
        
        if (result.isValid && result.cleanedProduct) {
          // Check for duplicate SKUs
          if (seenSkus.has(result.cleanedProduct.sku)) {
            summary.duplicateSkus++;
            summary.errors.push({
              row: i + 1,
              sku: result.cleanedProduct.sku,
              errors: ['Duplicate SKU found in import']
            });
          } else {
            seenSkus.add(result.cleanedProduct.sku);
            summary.products.push(result.cleanedProduct);
            summary.validProducts++;
          }
          
          summary.warnings += result.warnings.length;
        } else {
          summary.invalidProducts++;
          summary.errors.push({
            row: i + 1,
            sku: data.sku || 'Unknown',
            errors: result.errors
          });
        }
      }
    }
    
    // Generate insights for summary
    summary.detectedTypes = this.generateTypeInsights(summary.products);
    summary.detectedBrands = this.generateBrandInsights(summary.products);
    summary.specificationCoverage = this.generateSpecInsights(summary.products);
    
    return summary;
  }

  /**
   * Generate product type insights
   */
  private generateTypeInsights(products: UniversalProduct[]): Record<string, number> {
    const types: Record<string, number> = {};
    
    for (const product of products) {
      types[product.primaryType] = (types[product.primaryType] || 0) + 1;
    }
    
    return types;
  }

  /**
   * Generate brand insights
   */
  private generateBrandInsights(products: UniversalProduct[]): Record<string, number> {
    const brands: Record<string, number> = {};
    
    for (const product of products) {
      brands[product.brand] = (brands[product.brand] || 0) + 1;
    }
    
    return brands;
  }

  /**
   * Generate specification coverage insights
   */
  private generateSpecInsights(products: UniversalProduct[]): Record<string, number> {
    const specs: Record<string, number> = {};
    
    for (const product of products) {
      for (const specKey of Object.keys(product.specifications)) {
        specs[specKey] = (specs[specKey] || 0) + 1;
      }
    }
    
    return specs;
  }

  /**
   * Create text for universal analysis
   */
  private createAnalysisText(data: ExtractedData): string {
    return [
      data.sku || '',
      data.company || '',
      data.model || '',
      data.description || '',
      data.price ? `$${data.price}` : '',
      data.type || ''
    ].filter(Boolean).join(' ');
  }

  /**
   * Validate price with intelligent ranges based on product type
   */
  private validatePrice(price: number, productType: string): { error?: string; warnings: string[] } {
    const warnings: string[] = [];
    
    // Dynamic price ranges based on product type
    const priceRanges: Record<string, { min: number; max: number; typical: [number, number] }> = {
      'furnace': { min: 500, max: 15000, typical: [1500, 6000] },
      'heat-pump': { min: 800, max: 20000, typical: [2000, 8000] },
      'air-conditioner': { min: 600, max: 15000, typical: [1200, 5000] },
      'ahu': { min: 1000, max: 50000, typical: [3000, 15000] },
      'rooftop-unit': { min: 2000, max: 100000, typical: [8000, 40000] },
      'chiller': { min: 5000, max: 500000, typical: [20000, 200000] },
      'coil': { min: 50, max: 5000, typical: [200, 1500] },
      'fan': { min: 100, max: 10000, typical: [300, 2000] },
      'filter': { min: 5, max: 500, typical: [20, 150] },
      'damper': { min: 50, max: 3000, typical: [150, 800] },
      'control': { min: 20, max: 5000, typical: [100, 1000] },
      'valve': { min: 25, max: 2000, typical: [75, 500] },
      'compressor': { min: 200, max: 20000, typical: [800, 5000] },
      'motor': { min: 50, max: 5000, typical: [150, 1200] },
      'accessory': { min: 25, max: 2000, typical: [100, 600] },
      'unknown': { min: 10, max: 100000, typical: [100, 5000] }
    };
    
    const range = priceRanges[productType] || priceRanges['unknown'];
    
    if (price < range.min) {
      return { error: `Price $${price} is below minimum expected range for ${productType} (min: $${range.min})`, warnings: [] };
    }
    
    if (price > range.max) {
      return { error: `Price $${price} exceeds maximum expected range for ${productType} (max: $${range.max})`, warnings: [] };
    }
    
    if (price < range.typical[0] || price > range.typical[1]) {
      warnings.push(`Price $${price} is outside typical range for ${productType} ($${range.typical[0]} - $${range.typical[1]})`);
    }
    
    return { warnings };
  }

  /**
   * Generate fallback SKU if none provided
   */
  private generateFallbackSKU(data: ExtractedData): string {
    const parts = [];
    
    if (data.company) {
      parts.push(data.company.substring(0, 3).toUpperCase());
    }
    
    if (data.model) {
      parts.push(data.model.substring(0, 8));
    } else {
      parts.push(Date.now().toString().slice(-6));
    }
    
    return parts.join('-');
  }

  /**
   * Extract fallback brand from description or other fields
   */
  private extractFallbackBrand(data: ExtractedData): string | null {
    const text = `${data.description || ''} ${data.sku || ''}`.toLowerCase();
    
    // Known HVAC brands
    const brands = [
      'trane', 'carrier', 'lennox', 'york', 'goodman', 'rheem', 
      'payne', 'bryant', 'heil', 'tempstar', 'comfortmaker',
      'american standard', 'ruud', 'amana', 'daikin', 'mitsubishi'
    ];
    
    for (const brand of brands) {
      if (text.includes(brand)) {
        return brand.charAt(0).toUpperCase() + brand.slice(1);
      }
    }
    
    return null;
  }

  /**
   * Normalize specifications to consistent format
   */
  private normalizeSpecifications(specs: UniversalSpec[]): Record<string, any> {
    const normalized: Record<string, any> = {};
    
    for (const spec of specs) {
      const key = spec.type.toLowerCase() + (spec.unit ? `_${spec.unit.toLowerCase()}` : '');
      
      if (!normalized[key] || spec.confidence > (normalized[key].confidence || 0)) {
        normalized[key] = {
          value: spec.value,
          unit: spec.unit,
          confidence: spec.confidence,
          context: spec.context
        };
      }
    }
    
    return normalized;
  }

  /**
   * Map flexible primaryType to strict database type
   */
  private mapToDbType(primaryType: string): string {
    const typeMapping: Record<string, string> = {
      // Air conditioning variations
      'air-conditioner': 'AC',
      'air_conditioner': 'AC',
      'ac': 'AC',
      'cooling': 'AC',
      'condenser': 'AC',
      
      // Heat pump variations  
      'heat-pump': 'Heat Pump',
      'heat_pump': 'Heat Pump',
      'heatpump': 'Heat Pump',
      'hp': 'Heat Pump',
      
      // Furnace variations
      'furnace': 'Furnace',
      'gas-furnace': 'Furnace',
      'oil-furnace': 'Furnace',
      'heating': 'Furnace',
      
      // Air handler variations
      'air-handler': 'Air Handler',
      'air_handler': 'Air Handler',
      'airhandler': 'Air Handler',
      'ahu': 'Air Handler',
      'blower': 'Air Handler',
      
      // Default fallback
      'unknown': 'AC',
      'other': 'AC'
    };
    
    // Check if we have a mapping
    const normalized = primaryType.toLowerCase().trim();
    const mapped = typeMapping[normalized];
    if (mapped) return mapped;
    
    // Otherwise return the original type with proper capitalization
    // This allows for any equipment type in the price book
    return primaryType.split(/[-_\s]+/).map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ') || 'HVAC Equipment';
  }

  /**
   * Utility to capitalize words
   */
  private capitalizeWords(str: string): string {
    return str.replace(/\b\w+/g, word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  /**
   * Get validation statistics for reporting
   */
  getValidationStats(summary: ImportSummary) {
    const successRate = summary.totalProcessed > 0 
      ? (summary.validProducts / summary.totalProcessed * 100).toFixed(1)
      : '0';
    
    return {
      successRate: `${successRate}%`,
      totalProcessed: summary.totalProcessed,
      validProducts: summary.validProducts,
      invalidProducts: summary.invalidProducts,
      duplicates: summary.duplicateSkus,
      warnings: summary.warnings,
      hasErrors: summary.errors.length > 0,
      hasWarnings: summary.warnings > 0
    };
  }
}