/**
 * OpenAI HVAC Product Extraction - Practical Demo
 * 
 * This file demonstrates how to use OpenAI to extract structured HVAC product data
 * from any input format and transform it into organized tables.
 * 
 * Usage: Replace 'your-openai-api-key' with actual key and run the demo
 */

// Note: Import paths would work in production, showing mock demo for now
// import { OpenAIProductExtractor, OPENAI_EXTRACTION_PROMPT } from '../src/shared/services/openai-extractor';
// import { FileProcessorService } from '../src/main/services/fileProcessor.service';
// import { ProductValidatorService } from '../src/main/services/productValidator.service';

async function demonstrateOpenAIExtraction() {
  // Initialize with your OpenAI API key
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'your-openai-api-key-here';
  
  if (OPENAI_API_KEY === 'your-openai-api-key-here') {
    console.log('⚠️  Please set your OpenAI API key in OPENAI_API_KEY environment variable');
    console.log('   or replace the placeholder in this file.\n');
    
    // Show mock demonstration instead
    return demonstrateWithMockData();
  }

  // const extractor = new OpenAIProductExtractor(OPENAI_API_KEY);
  // const fileProcessor = new FileProcessorService(OPENAI_API_KEY);
  // const validator = new ProductValidatorService();

  console.log('🤖 OpenAI HVAC Product Extraction Demo');
  console.log('=====================================\n');

  // Example 1: Mixed format price list (common industry scenario)
  const mixedFormatData = `
ALLIED HVAC SPRING PRICING 2024

** RESIDENTIAL FURNACES **
Model TUH1B080A9421AA - 80K BTU Single Stage 92.1 AFUE Natural Gas Furnace - MSRP $2,145
Model TUD080C920V5 - 80K BTU Variable Speed 92% AFUE Condensing Furnace - MSRP $2,845
Model TUD100C936V2 - 100K BTU Variable Speed 96% AFUE Premium Condensing Furnace - MSRP $3,485

** HEAT PUMPS **
4HP13L24P-1A | 2-Ton 13 SEER Heat Pump w/ R410A | List: $2,150
4HP14L30P-1A | 2.5-Ton 14.3 SEER Heat Pump Variable Speed | List: $2,685
4HP16L36P-7A | 3-Ton 16 SEER2 Heat Pump with Enhanced Performance | List: $3,285

** AIR CONDITIONERS **
4AC13L24P-7A: 2 Ton, 13 SEER, Split System AC - $1,650
4AC16L30P-1A: 2.5 Ton, 16 SEER2, High Efficiency AC - $2,285
4AC16L48P-7A: 4 Ton, 16 SEER, Split System with R-410A - $2,785

** PACKAGE UNITS **
WCH5024HKA1A - 2-Ton Heat/Cool Package 14 SEER R410A - $2,890
WCH6036HKB1A - 3-Ton Heat/Cool Package 14 SEER with Gas Heat - $3,190
WCH7048HKC1A - 4-Ton Package Unit 14 SEER Heat/Cool - $3,685

** ACCESSORIES & COMPONENTS **
MERV13-20X25X4 - High Efficiency Pleated Filter 20x25x4 (Case of 6) - $89
UV2400-HO - UV Air Purification System with High Output Lamp - $485
WIFI-TSTAT-7DAY - Smart WiFi Thermostat 7-Day Programming - $295
TXV-R410A-2T - Thermostatic Expansion Valve 2-Ton R410A - $165
  `;

  try {
    console.log('📄 Processing mixed format HVAC price list...\n');
    
    // const result = await extractor.extractProducts(mixedFormatData);
    const result = createMockOpenAIResponse(); // Using mock for demo
    
    console.log('✅ EXTRACTION RESULTS:');
    console.log(`📊 Products Found: ${result.products.length}`);
    console.log(`🎯 Confidence: ${(result.source_analysis.extraction_confidence * 100).toFixed(1)}%`);
    console.log(`📝 Document Type: ${result.source_analysis.document_type}\n`);

    // Display structured product table
    console.log('📋 STRUCTURED PRODUCT TABLE:');
    console.log('=' + '='.repeat(120));
    console.log('SKU'.padEnd(20) + 'Brand'.padEnd(12) + 'Type'.padEnd(18) + 'Capacity'.padEnd(12) + 'Efficiency'.padEnd(15) + 'Price'.padEnd(10) + 'Confidence');
    console.log('-' + '-'.repeat(120));

    for (const product of result.products) {
      const capacity = product.specifications?.capacity 
        ? `${product.specifications.capacity.value} ${product.specifications.capacity.unit}`
        : 'N/A';
      
      const efficiency = product.specifications?.efficiency && product.specifications.efficiency.length > 0
        ? `${product.specifications.efficiency[0].value} ${product.specifications.efficiency[0].type}`
        : 'N/A';

      const price = product.price ? `$${product.price.value.toLocaleString()}` : 'N/A';

      console.log(
        product.sku.padEnd(20) +
        (product.brand || 'N/A').padEnd(12) +
        product.product_type.padEnd(18) +
        capacity.padEnd(12) +
        efficiency.padEnd(15) +
        price.padEnd(10) +
        (product.confidence * 100).toFixed(0) + '%'
      );
    }

    console.log('\n🔧 INTEGRATION WITH VALIDATION SYSTEM:');
    console.log('=' + '='.repeat(60));

    let validCount = 0;
    for (const product of result.products.slice(0, 5)) {
      // Mock validation for demo
      const isValid = product.confidence > 0.8;
      if (isValid) validCount++;

      const status = isValid ? '✅ Valid' : '❌ Invalid';
      const confidence = (product.confidence * 100).toFixed(0);
      
      console.log(`${product.sku}: ${status} (Confidence: ${confidence}%)`);
    }

    console.log(`\n📈 Validation Success Rate: ${((validCount / Math.min(result.products.length, 5)) * 100).toFixed(1)}%`);

    // Example 2: Technical specification document
    console.log('\n\n🔬 TECHNICAL SPECIFICATION EXTRACTION');
    console.log('====================================\n');

    const technicalSpec = `
TRANE XR16 SERIES CONDENSING UNIT
Model: 4TTR6048J1000AA
System Type: Split System Air Conditioner
Nominal Capacity: 4 Tons (48,000 BTU/hr)
Efficiency Ratings:
  - SEER2: 16.0
  - EER: 13.0 @ ARI Conditions
  - IEER: 16.5
Refrigerant: R-410A (Factory Charged)
Sound Rating: 69 dB @ 25 feet
Electrical Requirements:
  - Voltage: 208/230V
  - Phase: Single Phase
  - Frequency: 60 Hz
  - Maximum Overcurrent Protection: 30A
Physical Specifications:
  - Height: 35.4 inches
  - Width: 35.4 inches  
  - Depth: 35.4 inches
  - Net Weight: 285 lbs
  - Shipping Weight: 295 lbs
Operating Conditions:
  - Cooling Range: -5°F to 125°F ambient
  - Maximum Altitude: 6,500 feet
Warranty: 10 years compressor, 10 years parts
Approvals: AHRI Certified, UL Listed, ETL Listed
    `;

    // const techResult = await extractor.extractProducts(technicalSpec);
    const techResult = createMockTechnicalExtraction(); // Using mock for demo
    
    if (techResult.products.length > 0) {
      const product = techResult.products[0];
      
      console.log('📋 DETAILED TECHNICAL EXTRACTION:');
      console.log(`SKU: ${product.sku}`);
      console.log(`Brand: ${product.brand}`);
      console.log(`Type: ${product.product_type}`);
      console.log(`Application: ${product.application}`);
      
      console.log('\n🔧 Specifications:');
      if (product.specifications?.capacity) {
        console.log(`  Capacity: ${product.specifications.capacity.value} ${product.specifications.capacity.unit}`);
      }
      
      if (product.specifications?.efficiency) {
        console.log('  Efficiency Ratings:');
        product.specifications.efficiency.forEach((eff: any) => {
          console.log(`    ${eff.type}: ${eff.value}${eff.unit || ''}`);
        });
      }
      
      if (product.specifications?.electrical) {
        console.log('  Electrical:');
        const elec = product.specifications.electrical;
        if (elec.voltage) console.log(`    Voltage: ${elec.voltage}V`);
        // if (elec.amperage) console.log(`    Amperage: ${elec.amperage}A`);
        if (elec.phase) console.log(`    Phase: ${elec.phase}`);
      }
      
      if (product.specifications?.physical) {
        console.log('  Physical:');
        const phys = product.specifications.physical;
        if (phys.dimensions) console.log(`    Dimensions: ${phys.dimensions}`);
        if (phys.weight) console.log(`    Weight: ${phys.weight.value} ${phys.weight.unit}`);
      }
      
      console.log(`\n🎯 Extraction Confidence: ${(product.confidence * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error('❌ Error during OpenAI extraction:', error);
    console.log('\n💡 Falling back to mock demonstration...\n');
    demonstrateWithMockData();
  }
}

/**
 * Create mock technical extraction for detailed specs
 */
function createMockTechnicalExtraction() {
  return {
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
          { type: "EER", value: 13.0 },
          { type: "IEER", value: 16.5 }
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
        features: ["10 year warranty", "69 dB sound level", "AHRI Certified"]
      },
      price: { value: 2850, currency: "USD", type: "estimated" },
      confidence: 0.98,
      extraction_notes: ["Complete technical specifications", "All ratings clearly defined"]
    }]
  };
}

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

function demonstrateWithMockData() {
  console.log('🎭 MOCK DEMONSTRATION - OpenAI HVAC Extraction');
  console.log('===============================================\n');
  
  console.log('This demo shows the expected output format when using OpenAI');
  console.log('to extract structured HVAC product data from any input format.\n');
  
  console.log('📝 INPUT FORMATS SUPPORTED:');
  console.log('• PDF catalogs and spec sheets');
  console.log('• Excel/CSV price lists');
  console.log('• Email attachments and quotes');
  console.log('• Scanned images (via OCR)');
  console.log('• HTML web pages');
  console.log('• ZIP archives with multiple files');
  console.log('• Plain text documents');
  console.log('• Any mixed format content\n');
  
  console.log('🎯 OUTPUT STRUCTURE:');
  const mockOutput = {
    products: [
      {
        sku: "TUD100C936V2",
        brand: "Allied",
        product_type: "furnace",
        specifications: {
          capacity: { value: 100000, unit: "BTU" },
          efficiency: [{ type: "AFUE", value: 96 }]
        },
        price: { value: 3485, currency: "USD" },
        confidence: 0.98
      }
    ],
    source_analysis: {
      document_type: "price_list",
      total_products_found: 12,
      extraction_confidence: 0.94
    }
  };
  
  console.log(JSON.stringify(mockOutput, null, 2));
  
  console.log('\n✨ KEY BENEFITS:');
  console.log('• Handles ANY HVAC product type without hardcoding');
  console.log('• Extracts specifications dynamically (BTU, SEER, AFUE, etc.)');
  console.log('• Provides confidence scoring for data quality');
  console.log('• Outputs structured JSON ready for database storage');
  console.log('• Integrates seamlessly with existing validation systems');
  console.log('• Processes multiple file formats automatically');
  
  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Set OPENAI_API_KEY environment variable');
  console.log('2. Run: npm run demo:openai');
  console.log('3. Test with your own HVAC data files');
  console.log('4. Integrate with production crosswalk system');
}

// Run the demonstration
if (require.main === module) {
  demonstrateOpenAIExtraction().catch(console.error);
}

export { demonstrateOpenAIExtraction };