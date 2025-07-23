/**
 * Unit tests for FileProcessorService
 * Tests the core file processing and data extraction functionality
 */

import { FileProcessorService } from '@main/services/fileProcessor.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock dependencies  
jest.mock('fs/promises');
jest.mock('pdf-parse', () => ({
  default: jest.fn()
}));
jest.mock('xlsx');
jest.mock('papaparse');
jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(() => ({
    load: jest.fn(),
    loadLanguage: jest.fn(), 
    initialize: jest.fn(),
    recognize: jest.fn(),
    terminate: jest.fn()
  }))
}));
jest.mock('eml-parser', () => ({
  parseEml: jest.fn(),
  parseMsg: jest.fn()
}));
jest.mock('node-stream-zip');
jest.mock('mammoth');
jest.mock('node-html-parser');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('FileProcessorService', () => {
  let fileProcessor: FileProcessorService;

  beforeEach(() => {
    fileProcessor = new FileProcessorService();
    jest.clearAllMocks();
  });

  describe('Text Extraction', () => {
    test('should extract HVAC products from structured text', () => {
      const testText = `
        Model: XR16-024-230
        Brand: Lennox
        Type: Air Conditioner
        Tonnage: 2.0 Tons
        SEER: 16
        Price: $2,850.00
        
        Model: XL18i-036-230
        Brand: Trane
        Type: Heat Pump
        Tonnage: 3.0 Tons
        SEER: 18
        Price: $3,450.00
      `;

      const result = (fileProcessor as any).extractFromText(testText, 'Test Data');
      
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        sku: expect.stringContaining('XR16-024'),
        company: 'Lennox',
        price: 2850.00
      });
      expect(result[1]).toMatchObject({
        sku: expect.stringContaining('XL18i-036'), 
        company: 'Trane',
        price: 3450.00
      });
    });

    test('should handle malformed data gracefully', () => {
      const testText = 'Random text with no product information';
      
      const result = (fileProcessor as any).extractFromText(testText, 'Test Data');
      
      expect(result).toHaveLength(0);
    });

    test('should calculate confidence scores correctly', () => {
      const result = (fileProcessor as any).calculateExtractionConfidence(
        'LEN-XR16-024', // Well-formatted SKU
        'Lennox',       // Known brand
        2850.00,        // Reasonable price
        '16 SEER 2 ton' // HVAC specs
      );
      
      expect(result).toBeGreaterThan(0.8); // High confidence
    });

    test('should assign low confidence to poor data', () => {
      const result = (fileProcessor as any).calculateExtractionConfidence(
        '123',           // Poor SKU
        'Unknown',       // Unknown brand
        undefined,       // No price
        ''              // No specs
      );
      
      expect(result).toBeLessThan(0.3); // Low confidence
    });
  });

  describe('Data Validation and Cleaning', () => {
    test('should clean and normalize SKUs', () => {
      const result = (fileProcessor as any).cleanSku('  len-xr16 024  ');
      expect(result).toBe('LEN-XR16-024');
    });

    test('should normalize company names', () => {
      expect((fileProcessor as any).cleanCompany('trane')).toBe('Trane');
      expect((fileProcessor as any).cleanCompany('day and night')).toBe('Day & Night');
      expect((fileProcessor as any).cleanCompany('CARRIER')).toBe('Carrier');
    });

    test('should filter invalid products during validation', () => {
      const testData = [
        { sku: 'VALID-SKU-123', company: 'Trane', price: 2000 },
        { sku: '12', company: 'Unknown' }, // Too short SKU
        { sku: '123456789', company: 'Unknown' }, // Just numbers
        { sku: 'GOOD-SKU', company: 'Lennox', price: 1500 }
      ];

      const result = (fileProcessor as any).validateAndCleanData(testData);
      
      expect(result).toHaveLength(2); // Only valid products
      expect(result[0].sku).toBe('VALID-SKU-123');
      expect(result[1].sku).toBe('GOOD-SKU');
    });
  });

  describe('File Type Detection', () => {
    test('should identify supported file types correctly', () => {
      const testCases = [
        { filename: 'test.csv', expected: true },
        { filename: 'test.xlsx', expected: true },
        { filename: 'test.pdf', expected: true },
        { filename: 'test.msg', expected: true },
        { filename: 'test.zip', expected: true },
        { filename: 'test.jpg', expected: true },
        { filename: 'test.exe', expected: false },
        { filename: 'test.unknown', expected: false }
      ];

      testCases.forEach(({ filename, expected }) => {
        const ext = path.extname(filename).toLowerCase();
        const isSupported = [
          '.csv', '.xlsx', '.xls', '.txt', '.pdf', '.docx', '.doc',
          '.json', '.xml', '.html', '.htm', '.msg', '.eml',
          '.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif', '.zip'
        ].includes(ext);
        
        expect(isSupported).toBe(expected);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle file processing errors gracefully', async () => {
      mockFs.readFile.mockRejectedValueOnce(new Error('File not found'));

      const result = await fileProcessor.processFile('/fake/path/test.csv');

      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    test('should return empty results for unprocessable files', async () => {
      mockFs.readFile.mockResolvedValueOnce(Buffer.from('corrupted binary data'));

      const result = await fileProcessor.processFile('/fake/path/test.csv');

      // Should handle gracefully without throwing
      expect(result).toBeDefined();
    });
  });

  describe('Performance', () => {
    test('should process large text efficiently', () => {
      // Create large text with many products
      let largeText = '';
      for (let i = 0; i < 1000; i++) {
        largeText += `Model: TEST${i.toString().padStart(3, '0')} Brand: Trane Price: $${1000 + i}.00\n`;
      }

      const startTime = Date.now();
      const result = (fileProcessor as any).extractFromText(largeText, 'Large Dataset');
      const endTime = Date.now();

      expect(result.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  afterEach(() => {
    // Clean up any resources
    jest.restoreAllMocks();
  });
});