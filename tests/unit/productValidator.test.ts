/**
 * Unit tests for ProductValidatorService
 * Tests HVAC-specific product validation logic
 */

import { ProductValidatorService } from '@main/services/productValidator.service';
import type { ExtractedData } from '@main/services/fileProcessor.service';

describe('ProductValidatorService', () => {
  let validator: ProductValidatorService;

  beforeEach(() => {
    validator = new ProductValidatorService();
  });

  describe('SKU Validation', () => {
    test('should validate standard HVAC SKU formats', () => {
      const validSkus = [
        'TRN-XR16-024',   // Pattern: ^[A-Z]{2,4}[-\s]?[0-9]{2,4}[-\s]?[A-Z0-9]{2,6}$
        'CAR24ABC048',     // Pattern: ^[A-Z]{3,5}[0-9]{3,6}[A-Z]{0,3}$
        'LEN036ABC',      // Pattern: ^[A-Z]{3,5}[0-9]{3,6}[A-Z]{0,3}$
        '16SEER036A'      // Pattern: ^[0-9]{2}[A-Z]{2,4}[0-9]{3,6}[A-Z]?$
      ];

      validSkus.forEach(sku => {
        const result = (validator as any).isValidSkuFormat(sku);
        expect(result).toBe(true);
      });
    });

    test('should reject invalid SKU formats', () => {
      const invalidSkus = [
        '123',           // Too short
        'ABC',           // No numbers
        '!@#$%',         // Special characters
        'A1B2C3D4E5F6G7H8I9J0', // Too long
      ];

      invalidSkus.forEach(sku => {
        const result = (validator as any).isValidSkuFormat(sku);
        expect(result).toBe(false);
      });
    });
  });

  describe('Brand Recognition', () => {
    test('should recognize known HVAC brands', () => {
      const knownBrands = ['Trane', 'Carrier', 'Lennox', 'York', 'Goodman'];
      
      knownBrands.forEach(brand => {
        const result = (validator as any).isValidBrand(brand);
        expect(result).toBe(true);
      });
    });

    test('should infer brand from SKU prefix', () => {
      const testCases = [
        { sku: 'TRN-XR16-024', expected: 'Trane' },
        { sku: 'CAR-24ABC-048', expected: 'Carrier' },
        { sku: 'LEN036ABC', expected: 'Lennox' },
        { sku: 'YORK-YP036', expected: 'York' },
        { sku: 'UNKNOWN123', expected: null }
      ];

      testCases.forEach(({ sku, expected }) => {
        const result = (validator as any).inferBrandFromSku(sku);
        expect(result).toBe(expected);
      });
    });

    test('should normalize brand names correctly', () => {
      const testCases = [
        { input: 'trane', expected: 'Trane' },
        { input: 'CARRIER', expected: 'Carrier' },
        { input: 'day and night', expected: 'Day & Night' },
        { input: 'comfortmaker', expected: 'ComfortMaker' }
      ];

      testCases.forEach(({ input, expected }) => {
        const result = (validator as any).cleanBrand(input);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Technical Specifications Extraction', () => {
    test('should extract tonnage from description', () => {
      const testData: ExtractedData = {
        sku: 'TEST-001',
        company: 'Test',
        description: 'High efficiency 2.5 ton air conditioner with 16 SEER rating'
      };

      const product = { sku: 'TEST-001', model: 'TEST-001', brand: 'Test', type: 'air_conditioner' as const };
      const warnings: string[] = [];

      (validator as any).extractSpecs(testData, product, warnings);

      expect(product.tonnage).toBe(2.5);
      expect(product.seer).toBe(16);
    });

    test('should extract SEER ratings correctly', () => {
      const testCases = [
        { text: 'SEER 16 rating', expected: 16 },
        { text: 'SEER:18.5 efficiency', expected: 18.5 },
        { text: 'SEER2 15.2 new standard', expected: 15.2 },
        { text: '20 SEER high efficiency unit', expected: 20 }
      ];

      testCases.forEach(({ text, expected }) => {
        const testData: ExtractedData = { sku: 'TEST', company: 'Test', description: text };
        const product = { sku: 'TEST', model: 'TEST', brand: 'Test', type: 'air_conditioner' as const };
        const warnings: string[] = [];

        (validator as any).extractSpecs(testData, product, warnings);
        expect(product.seer || product.seer2).toBe(expected);
      });
    });

    test('should extract AFUE for furnaces', () => {
      const testData: ExtractedData = {
        sku: 'FURN-001',
        company: 'Test',
        description: 'High efficiency furnace with 92% AFUE rating'
      };

      const product = { sku: 'FURN-001', model: 'FURN-001', brand: 'Test', type: 'furnace' as const };
      const warnings: string[] = [];

      (validator as any).extractSpecs(testData, product, warnings);

      expect(product.afue).toBe(92);
    });

    test('should identify refrigerant types', () => {
      const testCases = [
        { text: 'R-410A refrigerant', expected: 'R-410A' },
        { text: 'Uses R22', expected: 'R-22' },
        { text: 'R-32 eco-friendly', expected: 'R-32' }
      ];

      testCases.forEach(({ text, expected }) => {
        const testData: ExtractedData = { sku: 'TEST', company: 'Test', description: text };
        const product = { sku: 'TEST', model: 'TEST', brand: 'Test', type: 'air_conditioner' as const };
        const warnings: string[] = [];

        (validator as any).extractSpecs(testData, product, warnings);
        expect(product.refrigerant).toBe(expected);
      });
    });

    test('should detect stage/speed information', () => {
      const testCases = [
        { text: 'variable speed compressor', expected: 'variable' },
        { text: 'two stage operation', expected: 'two-stage' },
        { text: 'single stage unit', expected: 'single' }
      ];

      testCases.forEach(({ text, expected }) => {
        const testData: ExtractedData = { sku: 'TEST', company: 'Test', description: text };
        const product = { sku: 'TEST', model: 'TEST', brand: 'Test', type: 'air_conditioner' as const };
        const warnings: string[] = [];

        (validator as any).extractSpecs(testData, product, warnings);
        expect(product.stage).toBe(expected);
      });
    });
  });

  describe('Product Type Inference', () => {
    test('should infer product types from descriptions', () => {
      const testCases = [
        { description: 'High efficiency heat pump', expected: 'heat_pump' },
        { description: 'Natural gas furnace', expected: 'furnace' },
        { description: 'Air conditioner unit', expected: 'air_conditioner' },
        { description: 'Evaporator coil assembly', expected: 'coil' }
      ];

      testCases.forEach(({ description, expected }) => {
        const result = (validator as any).inferProductType('TEST-001', description);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Bulk Import Processing', () => {
    test('should process multiple products with validation', async () => {
      const testData: ExtractedData[] = [
        {
          sku: 'TRN-XR16-024',
          company: 'Trane', 
          price: 2850,
          description: '2 ton 16 SEER air conditioner'
        },
        {
          sku: 'INVALID',
          company: '', // Missing company - should fail
          description: 'Invalid product'
        },
        {
          sku: 'CAR-24ABC-048',
          company: 'Carrier',
          price: 3200,
          description: '4 ton 15 SEER condenser'
        }
      ];

      const result = await validator.processBulkImport(testData);

      expect(result.totalProcessed).toBe(3);
      expect(result.validProducts).toBe(2);
      expect(result.invalidProducts).toBe(1);
      expect(result.products).toHaveLength(2);
      expect(result.errors).toHaveLength(1);
    });

    test('should detect duplicate SKUs', async () => {
      const testData: ExtractedData[] = [
        { sku: 'TEST-001', company: 'Trane', description: 'First product' },
        { sku: 'TEST-001', company: 'Trane', description: 'Duplicate SKU' }
      ];

      const result = await validator.processBulkImport(testData);

      expect(result.duplicateSkus).toBe(1);
      expect(result.validProducts).toBe(1); // Only first one should be kept
    });

    test('should generate validation statistics', () => {
      const mockSummary = {
        totalProcessed: 100,
        validProducts: 85,
        invalidProducts: 10,
        duplicateSkus: 5,
        warnings: 20,
        products: [],
        errors: []
      };

      const stats = validator.getValidationStats(mockSummary);

      expect(stats.successRate).toBe('85.0%');
      expect(stats.totalProcessed).toBe(100);
      expect(stats.validProducts).toBe(85);
      expect(stats.hasWarnings).toBe(true);
    });
  });

  describe('Price Validation', () => {
    test('should validate reasonable HVAC prices', () => {
      const testData: ExtractedData = {
        sku: 'TEST-001',
        company: 'Trane',
        price: 2850
      };

      const result = validator.validateProduct(testData);

      expect(result.isValid).toBe(true);
      expect(result.cleanedProduct?.msrp).toBe(2850);
      expect(result.warnings).toHaveLength(0);
    });

    test('should warn about unusual prices', () => {
      const highPrice: ExtractedData = {
        sku: 'TEST-001', 
        company: 'Trane',
        price: 60000 // Unusually high
      };

      const result = validator.validateProduct(highPrice);
      expect(result.warnings.some(w => w.includes('unusually high'))).toBe(true);

      const zeroPrice: ExtractedData = {
        sku: 'TEST-002',
        company: 'Trane', 
        price: 0
      };

      const result2 = validator.validateProduct(zeroPrice);
      expect(result2.warnings.some(w => w.includes('greater than 0'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty input gracefully', async () => {
      const result = await validator.processBulkImport([]);
      
      expect(result.totalProcessed).toBe(0);
      expect(result.validProducts).toBe(0);
      expect(result.products).toHaveLength(0);
    });

    test('should handle malformed data gracefully', () => {
      const badData: ExtractedData = {
        sku: '',
        company: '',
        price: NaN
      };

      const result = validator.validateProduct(badData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});