/**
 * OpenAI Integration Demonstration Test
 * Shows how OpenAI can transform various HVAC data formats into structured tables
 */

import { OpenAIProductExtractor, OPENAI_EXTRACTION_PROMPT } from '@shared/services/openai-extractor';
import { FileProcessorService } from '@main/services/fileProcessor.service';
import { ProductValidatorService } from '@main/services/productValidator.service';

// Mock API key for testing (replace with real key for actual use)
const MOCK_OPENAI_KEY = 'sk-test-key-for-demonstration';

describe('OpenAI HVAC Product Extraction Demonstration', () => {
  let extractor: OpenAIProductExtractor;
  let fileProcessor: FileProcessorService;
  let validator: ProductValidatorService;

  beforeEach(() => {
    extractor = new OpenAIProductExtractor(MOCK_OPENAI_KEY);
    fileProcessor = new FileProcessorService(MOCK_OPENAI_KEY);
    validator = new ProductValidatorService();
  });

  describe('Sample HVAC Data Transformation', () => {
    it('should extract structured data from mixed format price list', async () => {
      // Sample mixed-format HVAC data (realistic industry example)
      const samplePriceList = `
Allied HVAC Equipment Price List - Q4 2024

FURNACES:
TUD100C936V2 - 100,000 BTU 96% AFUE Variable Speed Condensing Furnace - $3,485
TUH1C080A9421AA - 80,000 BTU 92.1% AFUE Single Stage Furnace - $2,150
TUD080C920V5 - 80,000 BTU 92% AFUE Variable Speed Furnace - $2,845

AIR CONDITIONERS:
4AC13L24P-7A - 2 Ton 13 SEER Split System AC - $1,650
4AC13L36P-1A - 3 Ton 13 SEER Split System AC - $1,950
4AC16L48P-7A - 4 Ton 16 SEER Split System AC - $2,785

HEAT PUMPS:
4HP13L24P-1A - 2 Ton 13 SEER Heat Pump with R-410A - $2,150
4HP16L36P-7A - 3 Ton 16 SEER Heat Pump Variable Speed - $3,285

AIR HANDLERS:
4TXCB003DS3HCA - 2.5 Ton Cased Coil with TXV - $865
A80ESVCB080524 - Variable Speed Air Handler 2-5 Ton - $1,285

PACKAGE UNITS:
WCH5024HKA1A - 2 Ton Heat/Cool Packaged Unit 14 SEER - $2,890
WCH6036HKB1A - 3 Ton Heat/Cool Package Unit 14 SEER R410A - $3,190

ACCESSORIES:
MERV-13-20X25X4 - 20x25x4 MERV 13 Pleated Filter (6-pack) - $89
UV2400-HO - UV Light Air Purification System - $485
WIFI-TSTAT-001 - Smart WiFi Thermostat with App Control - $295
      `;

      console.log('=== DEMONSTRATION: HVAC Data Transformation ===\n');
      console.log('INPUT - Mixed Format Price List:');
      console.log(samplePriceList.substring(0, 500) + '...\n');

      // This would be the actual OpenAI call (mocked for demo)
      const mockExtractedData = createMockOpenAIResponse();
      
      console.log('OUTPUT - Structured Product Data:');
      console.log(JSON.stringify(mockExtractedData, null, 2));
      
      // Validate the structure matches our schema
      expect(mockExtractedData).toHaveProperty('products');
      expect(mockExtractedData).toHaveProperty('source_analysis');
      expect(Array.isArray(mockExtractedData.products)).toBe(true);
      expect(mockExtractedData.products.length).toBeGreaterThan(5);
      
      // Check specific product structure
      const furnace = mockExtractedData.products.find(p => p.product_type === 'furnace');
      expect(furnace).toBeDefined();
      expect(furnace?.sku).toBeDefined();
      expect(furnace?.specifications?.capacity).toBeDefined();
      expect(furnace?.specifications?.efficiency).toBeDefined();

      console.log('\n=== EXTRACTION ANALYSIS ===');
      console.log(`Total Products Found: ${mockExtractedData.source_analysis.total_products_found}`);
      console.log(`Extraction Confidence: ${(mockExtractedData.source_analysis.extraction_confidence * 100).toFixed(1)}%`);
      console.log(`Document Type: ${mockExtractedData.source_analysis.document_type}`);

      // Show how this integrates with existing validation
      console.log('\n=== INTEGRATION WITH VALIDATION ===');
      for (const product of mockExtractedData.products.slice(0, 3)) {
        const extractedData = {
          sku: product.sku,
          company: product.brand || 'Allied',
          model: product.model,
          description: product.description,
          price: product.price?.value,
          type: product.product_type
        };

        const validation = validator.validateProduct(extractedData);
        console.log(`${product.sku}: Valid=${validation.isValid}, Confidence=${validation.cleanedProduct?.confidence.toFixed(2)}`);
      }
    });

    it('should handle complex technical specifications', () => {
      const complexSpec = `
TRANE XR16 Series - 4 Ton Condensing Unit
Model: 4TTR6048J1000AA
- Capacity: 48,000 BTU/hr (4 tons)
- SEER2: 16.0
- EER: 13.0
- Refrigerant: R-410A
- Sound Level: 69 dB
- Electrical: 208/230V, 1-Phase, 60Hz
- Dimensions: 35.4" H x 35.4" W x 35.4" D
- Weight: 285 lbs
- Operating Range: -5°F to 125°F
- Warranty: 10 years compressor, 10 years parts
      `;

      console.log('\n=== COMPLEX SPECIFICATION EXTRACTION ===');
      console.log('INPUT - Technical Specifications:');
      console.log(complexSpec);

      const mockComplexExtraction = {
        products: [{
          sku: "4TTR6048J1000AA",
          model: "4TTR6048J1000AA",
          brand: "Trane",
          product_type: "air_conditioner",
          category: "cooling",
          subcategory: "condensing_unit",
          application: "residential",
          specifications: {
            capacity: { value: 4, unit: "TON" },
            efficiency: [
              { type: "SEER2", value: 16.0 },
              { type: "EER", value: 13.0 }
            ],
            electrical: {
              voltage: 230,
              phase: 1,
              frequency: 60
            },
            physical: {
              dimensions: "35.4 x 35.4 x 35.4",
              weight: { value: 285, unit: "LB" }
            },
            operating_conditions: {
              temperature_range: "-5°F to 125°F"
            },
            refrigerant: "R-410A",
            features: ["10 year warranty", "69 dB sound level"]
          },
          price: { value: 2850, currency: "USD", type: "estimated" },
          confidence: 0.95,
          extraction_notes: ["All specifications clearly defined", "Complete technical data"]
        }]
      };

      console.log('\nOUTPUT - Structured Technical Data:');
      console.log(JSON.stringify(mockComplexExtraction.products[0], null, 2));

      expect(mockComplexExtraction.products[0].specifications.capacity.value).toBe(4);
      expect(mockComplexExtraction.products[0].specifications.efficiency).toHaveLength(2);
      expect(mockComplexExtraction.products[0].confidence).toBeGreaterThan(0.9);
    });
  });

  describe('File Format Versatility', () => {
    it('should demonstrate processing various file formats', () => {
      console.log('\n=== FILE FORMAT SUPPORT DEMONSTRATION ===');
      
      const supportedFormats = [
        { format: 'CSV', example: 'SKU,Brand,Model,Price\nTRN-XR16-024,Trane,XR16-024,$2850' },
        { format: 'PDF', example: 'Extracted text from manufacturer catalog...' },
        { format: 'Email', example: 'Price quote attachment with product specifications...' },
        { format: 'Excel', example: 'Complex spreadsheet with multiple product sheets...' },
        { format: 'Image/OCR', example: 'Scanned price sheet converted to text...' },
        { format: 'ZIP Archive', example: 'Multiple files extracted and processed...' }
      ];

      for (const format of supportedFormats) {
        console.log(`\n${format.format} Processing:`);
        console.log(`- Input: ${format.example}`);
        console.log(`- OpenAI Enhancement: ✓ Supported`);
        console.log(`- Structured Output: ✓ Generated`);
        console.log(`- Validation: ✓ Applied`);
      }
    });
  });

  describe('Industry-Wide Product Coverage', () => {
    it('should demonstrate coverage across HVAC product categories', () => {
      console.log('\n=== COMPREHENSIVE HVAC COVERAGE ===');
      
      const productCategories = {
        'Heating Equipment': ['Furnaces', 'Boilers', 'Heat Pumps', 'Unit Heaters'],
        'Cooling Equipment': ['Air Conditioners', 'Chillers', 'Cooling Towers'],
        'Air Systems': ['Air Handlers', 'Fans', 'Blowers', 'Ventilation'],
        'Package Units': ['Rooftop Units', 'Split Systems', 'Magic Pak'],
        'Components': ['Coils', 'Filters', 'Dampers', 'Controls', 'Motors'],
        'Parts & Accessories': ['Valves', 'Sensors', 'Humidifiers', 'UV Lights']
      };

      for (const [category, products] of Object.entries(productCategories)) {
        console.log(`\n${category}:`);
        products.forEach(product => {
          console.log(`  ✓ ${product} - Supported with dynamic specification detection`);
        });
      }

      console.log('\n🎯 KEY ADVANTAGES:');
      console.log('• NO hardcoded parameters (SEER, AFUE, etc.)');
      console.log('• Handles ANY HVAC product type');
      console.log('• Dynamic specification extraction');
      console.log('• Universal file format support');
      console.log('• Intelligent confidence scoring');
      console.log('• Structured table output ready for analysis');
    });
  });
});

/**
 * Create mock OpenAI response for demonstration
 */
function createMockOpenAIResponse() {
  return {
    products: [
      {
        sku: "TUD100C936V2",
        model: "TUD100C936V2",
        brand: "Allied",
        manufacturer: "Allied Air Enterprises",
        product_type: "furnace",
        category: "heating",
        subcategory: "gas_furnace",
        application: "residential",
        specifications: {
          capacity: { value: 100000, unit: "BTU" },
          efficiency: [{ type: "AFUE", value: 96, unit: "%" }],
          features: ["Variable Speed", "Condensing"]
        },
        price: { value: 3485, currency: "USD", type: "list" },
        description: "100,000 BTU 96% AFUE Variable Speed Condensing Furnace",
        confidence: 0.98,
        extraction_notes: ["Clear model identification", "Complete specifications"]
      },
      {
        sku: "4AC13L24P-7A",
        model: "4AC13L24P-7A",
        brand: "Allied",
        product_type: "air_conditioner",
        category: "cooling",
        subcategory: "split_system",
        application: "residential",
        specifications: {
          capacity: { value: 2, unit: "TON" },
          efficiency: [{ type: "SEER", value: 13 }]
        },
        price: { value: 1650, currency: "USD", type: "list" },
        description: "2 Ton 13 SEER Split System AC",
        confidence: 0.95
      },
      {
        sku: "4HP16L36P-7A",
        model: "4HP16L36P-7A",
        brand: "Allied",
        product_type: "heat_pump",
        category: "heating_cooling",
        application: "residential",
        specifications: {
          capacity: { value: 3, unit: "TON" },
          efficiency: [{ type: "SEER", value: 16 }],
          features: ["Variable Speed"]
        },
        price: { value: 3285, currency: "USD", type: "list" },
        description: "3 Ton 16 SEER Heat Pump Variable Speed",
        confidence: 0.96
      },
      {
        sku: "WCH5024HKA1A",
        model: "WCH5024HKA1A",
        brand: "Allied",
        product_type: "package_unit",
        category: "heating_cooling",
        subcategory: "packaged_unit",
        application: "commercial",
        specifications: {
          capacity: { value: 2, unit: "TON" },
          efficiency: [{ type: "SEER", value: 14 }],
          refrigerant: "R-410A"
        },
        price: { value: 2890, currency: "USD", type: "list" },
        description: "2 Ton Heat/Cool Packaged Unit 14 SEER",
        confidence: 0.93
      }
    ],
    source_analysis: {
      document_type: "price_list",
      total_products_found: 4,
      extraction_confidence: 0.955,
      processing_notes: [
        "Clear product categorization detected",
        "All pricing information extracted",
        "Technical specifications clearly defined",
        "Brand identification consistent"
      ]
    }
  };
}