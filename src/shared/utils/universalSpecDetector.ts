/**
 * UNIVERSAL HVAC Specification Detection Engine
 * Dynamically identifies and extracts ANY HVAC product specification
 * NO HARDCODING - Adapts to any product type, brand, or specification format
 */

import { SPEC_PARAMETERS, PRODUCT_TYPE_PATTERNS, UNIVERSAL_EXTRACTION_PATTERNS } from '../constants/hvac-universal';

export interface UniversalSpec {
  type: string;
  value: string | number;
  unit?: string;
  confidence: number;
  context: string;
  source: string;
}

export interface ProductClassification {
  primaryType: string;
  subTypes: string[];
  confidence: number;
  detectedPatterns: string[];
}

export interface UniversalProductData {
  // Core identifiers
  sku?: string;
  model?: string;
  brand?: string;
  
  // Product classification
  classification: ProductClassification;
  
  // Dynamic specifications - no hardcoding
  specifications: UniversalSpec[];
  
  // Contextual data
  description?: string;
  price?: number;
  source: string;
  confidence: number;
}

/**
 * Universal Specification Detection Engine
 * Analyzes any text and dynamically extracts ALL specifications
 */
export class UniversalSpecDetector {
  
  /**
   * Main extraction method - completely dynamic
   */
  static extractUniversalSpecs(text: string, source: string): UniversalProductData {
    const normalizedText = text.toLowerCase();
    
    return {
      sku: this.extractSKU(text),
      model: this.extractModel(text),
      brand: this.extractBrand(text),
      classification: this.classifyProduct(text),
      specifications: this.extractAllSpecifications(text, source),
      description: this.extractDescription(text),
      price: this.extractPrice(text),
      source,
      confidence: this.calculateOverallConfidence(text)
    };
  }

  /**
   * Dynamic product classification - no hardcoded types
   */
  private static classifyProduct(text: string): ProductClassification {
    const normalizedText = text.toLowerCase();
    const matches: { type: string; count: number; patterns: string[] }[] = [];

    // Test against all product type patterns
    for (const [productType, patterns] of Object.entries(PRODUCT_TYPE_PATTERNS)) {
      let matchCount = 0;
      const matchedPatterns: string[] = [];

      for (const pattern of patterns) {
        const patternMatches = normalizedText.match(pattern);
        if (patternMatches) {
          matchCount += patternMatches.length;
          matchedPatterns.push(pattern.source);
        }
      }

      if (matchCount > 0) {
        matches.push({
          type: productType,
          count: matchCount,
          patterns: matchedPatterns
        });
      }
    }

    // Sort by match count and confidence
    matches.sort((a, b) => b.count - a.count);

    if (matches.length === 0) {
      return {
        primaryType: 'unknown',
        subTypes: [],
        confidence: 0,
        detectedPatterns: []
      };
    }

    const primary = matches[0];
    const subTypes = matches.slice(1, 4).map(m => m.type);

    return {
      primaryType: primary.type,
      subTypes,
      confidence: Math.min(primary.count * 0.3, 1.0),
      detectedPatterns: primary.patterns
    };
  }

  /**
   * Extract ALL specifications dynamically
   */
  private static extractAllSpecifications(text: string, source: string): UniversalSpec[] {
    const specs: UniversalSpec[] = [];

    // Capacity specifications
    for (const pattern of SPEC_PARAMETERS.CAPACITY.patterns) {
      const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        if (match[1]) {
          specs.push({
            type: 'CAPACITY',
            value: parseFloat(match[1]),
            unit: this.detectUnit(match[0]),
            confidence: this.calculateSpecConfidence(match[0], text),
            context: this.getContext(text, match.index!),
            source
          });
        }
      }
    }

    // Efficiency specifications
    for (const pattern of SPEC_PARAMETERS.EFFICIENCY.patterns) {
      const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        if (match[1]) {
          specs.push({
            type: 'EFFICIENCY',
            value: parseFloat(match[1]),
            unit: this.detectEfficiencyType(match[0]),
            confidence: this.calculateSpecConfidence(match[0], text),
            context: this.getContext(text, match.index!),
            source
          });
        }
      }
    }

    // Physical dimensions
    for (const pattern of SPEC_PARAMETERS.DIMENSIONS.patterns) {
      const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        if (match[1]) {
          specs.push({
            type: 'DIMENSIONS',
            value: this.parseDimensions(match),
            unit: this.detectDimensionUnit(match[0]),
            confidence: this.calculateSpecConfidence(match[0], text),
            context: this.getContext(text, match.index!),
            source
          });
        }
      }
    }

    // Electrical specifications
    for (const pattern of SPEC_PARAMETERS.ELECTRICAL.patterns) {
      const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        if (match[1]) {
          specs.push({
            type: 'ELECTRICAL',
            value: parseFloat(match[1]),
            unit: this.detectElectricalType(match[0]),
            confidence: this.calculateSpecConfidence(match[0], text),
            context: this.getContext(text, match.index!),
            source
          });
        }
      }
    }

    // Operating conditions
    for (const pattern of SPEC_PARAMETERS.OPERATING.patterns) {
      const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        if (match[1]) {
          specs.push({
            type: 'OPERATING',
            value: this.parseOperatingValue(match),
            unit: this.detectOperatingUnit(match[0]),
            confidence: this.calculateSpecConfidence(match[0], text),
            context: this.getContext(text, match.index!),
            source
          });
        }
      }
    }

    // Refrigerant and fuel types
    for (const pattern of SPEC_PARAMETERS.REFRIGERANT.patterns) {
      const matches = text.matchAll(new RegExp(pattern.source, 'gi'));
      for (const match of matches) {
        specs.push({
          type: 'REFRIGERANT_FUEL',
          value: match[0].trim(),
          confidence: this.calculateSpecConfidence(match[0], text),
          context: this.getContext(text, match.index!),
          source
        });
      }
    }

    // Remove duplicates and sort by confidence
    return this.deduplicateSpecs(specs).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Dynamic SKU extraction - no hardcoded patterns
   */
  private static extractSKU(text: string): string | undefined {
    for (const pattern of UNIVERSAL_EXTRACTION_PATTERNS.MODEL_SKU) {
      const match = text.match(pattern);
      if (match) {
        const sku = match[1] || match[0];
        if (this.isValidSKU(sku)) {
          return sku.trim().toUpperCase();
        }
      }
    }
    return undefined;
  }

  /**
   * Dynamic model extraction
   */
  private static extractModel(text: string): string | undefined {
    // Try explicit model patterns first
    const modelPatterns = [
      /model[\s:#]*([A-Z0-9][\w\-\/\.]{2,30})/gi,
      /series[\s:#]*([A-Z0-9][\w\-\/\.]{2,30})/gi
    ];

    for (const pattern of modelPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback to SKU if no explicit model found
    return this.extractSKU(text);
  }

  /**
   * Dynamic brand extraction
   */
  private static extractBrand(text: string): string | undefined {
    for (const pattern of UNIVERSAL_EXTRACTION_PATTERNS.COMPANY) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const brand = match[1].trim();
        if (this.isValidBrand(brand)) {
          return this.normalizeBrand(brand);
        }
      }
    }
    return undefined;
  }

  /**
   * Extract price with universal currency support
   */
  private static extractPrice(text: string): number | undefined {
    for (const pattern of UNIVERSAL_EXTRACTION_PATTERNS.PRICE) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const priceStr = match[1].replace(/[,\s]/g, '');
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }
    return undefined;
  }

  /**
   * Helper methods for dynamic detection  
   */
  private static detectUnit(matchText: string): string {
    const lowerText = matchText.toLowerCase();
    if (lowerText.includes('btu')) return 'BTU';
    if (lowerText.includes('ton')) return 'TON';
    if (lowerText.includes('kw')) return 'KW';
    if (lowerText.includes('cfm')) return 'CFM';
    if (lowerText.includes('gpm')) return 'GPM';
    return '';
  }

  private static detectEfficiencyType(matchText: string): string {
    const lowerText = matchText.toLowerCase();
    if (lowerText.includes('seer2')) return 'SEER2';
    if (lowerText.includes('seer')) return 'SEER';
    if (lowerText.includes('eer')) return 'EER';
    if (lowerText.includes('ieer')) return 'IEER';
    if (lowerText.includes('afue')) return 'AFUE';
    if (lowerText.includes('hspf')) return 'HSPF';
    if (lowerText.includes('cop')) return 'COP';
    return 'EFFICIENCY';
  }

  private static detectDimensionUnit(matchText: string): string {
    if (matchText.toLowerCase().includes('ft')) return 'FT';
    if (matchText.toLowerCase().includes('in')) return 'IN';
    if (matchText.toLowerCase().includes('lb')) return 'LB';
    if (matchText.toLowerCase().includes('kg')) return 'KG';
    return '';
  }

  private static detectElectricalType(matchText: string): string {
    const lowerText = matchText.toLowerCase();
    if (lowerText.includes('volt')) return 'VOLTAGE';
    if (lowerText.includes('amp')) return 'AMPERAGE';
    if (lowerText.includes('phase')) return 'PHASE';
    if (lowerText.includes('hz')) return 'FREQUENCY';
    if (lowerText.includes('kw')) return 'POWER';
    return '';
  }

  private static detectOperatingUnit(matchText: string): string {
    const lowerText = matchText.toLowerCase();
    if (lowerText.includes('wc') || lowerText.includes('iwc')) return 'IN_WC';
    if (lowerText.includes('psi')) return 'PSI';
    if (lowerText.includes('cfm')) return 'CFM';
    if (lowerText.includes('gpm')) return 'GPM';
    return '';
  }

  private static parseDimensions(match: RegExpMatchArray): string {
    if (match[3]) {
      return `${match[1]} x ${match[2]} x ${match[3]}`;
    } else if (match[2]) {
      return `${match[1]} x ${match[2]}`;
    }
    return match[1];
  }

  private static parseOperatingValue(match: RegExpMatchArray): string | number {
    if (match[2]) {
      return `${match[1]} to ${match[2]}`;
    }
    return parseFloat(match[1]);
  }

  private static calculateSpecConfidence(matchText: string, fullText: string): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for explicit labels
    if (/\b(seer|afue|eer|btu|ton|cfm)\b/i.test(matchText)) {
      confidence += 0.3;
    }

    // Higher confidence for structured format
    if (/[\s:=]\s*\d/.test(matchText)) {
      confidence += 0.2;
    }

    // Context boost if surrounded by HVAC terms
    const contextWindow = this.getContext(fullText, fullText.indexOf(matchText));
    if (/\b(hvac|air|heat|cool|efficiency|performance)\b/i.test(contextWindow)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private static calculateOverallConfidence(text: string): number {
    let confidence = 0;

    // Presence of key identifiers
    if (this.extractSKU(text)) confidence += 0.3;
    if (this.extractBrand(text)) confidence += 0.2;
    if (this.extractPrice(text)) confidence += 0.2;
    
    // Presence of technical specifications
    const specs = this.extractAllSpecifications(text, 'test');
    confidence += Math.min(specs.length * 0.05, 0.3);

    return Math.min(confidence, 1.0);
  }

  private static getContext(text: string, position: number, window: number = 100): string {
    const start = Math.max(0, position - window);
    const end = Math.min(text.length, position + window);
    return text.slice(start, end);
  }

  private static isValidSKU(sku: string): boolean {
    // Basic validation - at least 3 chars, contains alphanumeric
    return sku.length >= 3 && /[A-Z0-9]/.test(sku.toUpperCase());
  }

  private static isValidBrand(brand: string): boolean {
    // Basic validation - reasonable length, starts with letter
    return brand.length >= 2 && brand.length <= 50 && /^[A-Za-z]/.test(brand);
  }

  private static normalizeBrand(brand: string): string {
    return brand.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private static extractDescription(text: string): string | undefined {
    // Return first substantial sentence or paragraph
    const sentences = text.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (sentence.trim().length > 50 && sentence.trim().length < 300) {
        return sentence.trim();
      }
    }
    return text.length > 300 ? text.substring(0, 297) + '...' : text;
  }

  private static deduplicateSpecs(specs: UniversalSpec[]): UniversalSpec[] {
    const seen = new Set<string>();
    return specs.filter(spec => {
      const key = `${spec.type}-${spec.value}-${spec.unit}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}