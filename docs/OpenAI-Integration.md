# OpenAI HVAC Product Extraction Integration

## Overview

This document explains how OpenAI GPT-4 is integrated into the HVAC crosswalk system to extract structured product data from any input format and transform it into organized, searchable tables.

## Problem Solved

Traditional HVAC product data comes in countless formats:
- PDF manufacturer catalogs
- Excel price lists with varying column structures  
- Email attachments with quotes
- Scanned images of spec sheets
- HTML web pages
- Mixed-format documents combining text, tables, and specifications

Each requires custom parsing logic, and specifications vary wildly across:
- Product types (furnaces, ACs, heat pumps, package units, etc.)
- Efficiency ratings (SEER, SEER2, AFUE, HSPF, EER, COP)
- Capacity units (BTU, tons, CFM, GPM)
- Electrical specifications (voltage, amperage, phase)
- Physical dimensions and operating conditions

## Solution Architecture

### 1. Universal File Processing
```typescript
// FileProcessorService supports ANY file format
const processor = new FileProcessorService(OPENAI_API_KEY);
const result = await processor.processFile('mixed-format-catalog.pdf', true);
```

Supported formats:
- **Documents**: PDF, Word, text, HTML
- **Spreadsheets**: Excel, CSV, LibreOffice
- **Images**: JPG, PNG, TIFF (via OCR)
- **Email**: MSG, EML with attachments
- **Archives**: ZIP, RAR with nested files
- **Data**: JSON, XML, databases

### 2. OpenAI Extraction Engine
```typescript
// OpenAI transforms any content into structured data
const extractor = new OpenAIProductExtractor(apiKey);
const structured = await extractor.extractProducts(rawContent);
```

**Input** (any format):
```
ALLIED HVAC SPRING PRICING 2024
Model TUD100C936V2 - 100K BTU Variable Speed 96% AFUE Condensing Furnace - MSRP $3,485
4HP16L36P-7A | 3-Ton 16 SEER2 Heat Pump with Enhanced Performance | List: $3,285
```

**Output** (structured JSON):
```json
{
  "products": [
    {
      "sku": "TUD100C936V2",
      "brand": "Allied", 
      "product_type": "furnace",
      "specifications": {
        "capacity": {"value": 100000, "unit": "BTU"},
        "efficiency": [{"type": "AFUE", "value": 96}]
      },
      "price": {"value": 3485, "currency": "USD"},
      "confidence": 0.98
    }
  ]
}
```

### 3. Dynamic Specification Detection

**No hardcoding** - the system adapts to ANY specification type:

```typescript
// Universal specification patterns
export const SPEC_PARAMETERS = {
  CAPACITY: {
    patterns: [
      /(\\d+(?:\\.\\d+)?)\\s*(?:btu|btuh|mbh)/gi,
      /(\\d+(?:\\.\\d+)?)\\s*(?:ton|tons|tonnage)/gi,
      /(\\d+(?:\\.\\d+)?)\\s*(?:cfm|cubic feet)/gi
    ]
  },
  EFFICIENCY: {
    patterns: [
      /(?:seer|seasonal energy efficiency)[\\s:]*(\\d+(?:\\.\\d+)?)/gi,
      /(?:afue|annual fuel utilization)[\\s:]*(\\d+(?:\\.\\d+)?)%?/gi,
      /(?:cop|coefficient of performance)[\\s:]*(\\d+(?:\\.\\d+)?)/gi
    ]
  }
  // Dynamically detects ANY specification type
};
```

### 4. Intelligent Data Merging

The system combines traditional parsing with OpenAI enhancement:

```typescript
// Hybrid approach - best of both worlds
const traditionalData = await processFileTraditionally(file);
const openaiData = await openaiExtractor.extractProducts(content);
const merged = mergeTraditionalWithOpenAI(traditionalData, openaiData);
```

Benefits:
- **Fallback reliability**: If OpenAI fails, traditional parsing continues
- **Enhanced accuracy**: OpenAI fills gaps in traditional extraction  
- **Confidence scoring**: Each product rated for data quality
- **Cost efficiency**: Only uses OpenAI when beneficial

## Product Coverage

### Complete HVAC Industry Support

**Heating Equipment**:
- Gas/Electric/Oil Furnaces
- Boilers (Steam, Hot Water, Combination)
- Heat Pumps (Air/Ground/Water Source)
- Unit Heaters, Radiant Systems

**Cooling Equipment**:
- Central Air Conditioners
- Chillers (Air/Water Cooled)
- Cooling Towers, Evaporative Coolers

**Air Systems**:
- Air Handling Units (AHU)
- Fans, Blowers, Ventilation Equipment

**Package Units**:
- Rooftop Units (RTU)
- Split Systems, VRF/VRV
- Magic Pak, Self-Contained Units

**Components & Parts**:
- Coils, Filters, Dampers
- Controls, Valves, Motors
- Compressors, Accessories

### Specification Types Detected

The system dynamically identifies ANY specification:

- **Capacity**: BTU, Tons, KW, CFM, GPM
- **Efficiency**: SEER, SEER2, AFUE, HSPF, EER, IEER, COP
- **Electrical**: Voltage, Amperage, Phase, Frequency
- **Physical**: Dimensions, Weight, Sound Levels
- **Operating**: Temperature Range, Pressure, Flow Rates
- **Features**: Refrigerant Type, Fuel Type, Stage Control

## Implementation Examples

### Basic Usage

```typescript
import { FileProcessorService } from './services/fileProcessor.service';

// Initialize with OpenAI API key
const processor = new FileProcessorService(process.env.OPENAI_API_KEY);

// Process any file format
const result = await processor.processFile('hvac-catalog.pdf', true);

console.log(`Found ${result.data.length} products`);
console.log(`Extraction method: ${result.extractionMethod}`);
console.log(`Processing time: ${result.processingTime}ms`);

// Access structured data
result.data.forEach(product => {
  console.log(`${product.sku}: ${product.company} - $${product.price}`);
});
```

### Advanced Integration

```typescript
// Batch processing multiple files
const files = ['prices.xlsx', 'specs.pdf', 'quote.msg'];
const results = await Promise.all(
  files.map(file => processor.processFile(file, true))
);

// Validation and quality control
const validator = new ProductValidatorService();
const summary = await validator.processBulkImport(
  results.flatMap(r => r.data)
);

console.log(`Validation success rate: ${summary.validProducts / summary.totalProcessed * 100}%`);
```

### Custom OpenAI Processing

```typescript
// Direct OpenAI extraction for custom content
const extractor = new OpenAIProductExtractor(apiKey);
const customContent = "Complex HVAC specification text...";

const result = await extractor.extractProducts(customContent);

// Batch processing for large documents  
const chunks = splitLargeDocument(content, 4000);
const results = await extractor.extractProductsBatch(chunks);
const merged = extractor.mergeExtractionResults(results);
```

## Quality Assurance

### Confidence Scoring

Every extracted product includes confidence metrics:

```json
{
  "sku": "TRN-XR16-024",
  "confidence": 0.95,
  "extraction_notes": [
    "Clear model identification",
    "Complete specifications found", 
    "Price clearly stated"
  ]
}
```

Confidence factors:
- **SKU clarity**: Well-formed model numbers
- **Brand recognition**: Known HVAC manufacturers
- **Specification completeness**: Technical data present
- **Context validation**: Surrounding text supports extraction

### Error Handling

```typescript
// Graceful degradation
try {
  const openaiResult = await extractor.extractProducts(content);
  return enhancedData;
} catch (error) {
  console.warn('OpenAI enhancement failed, using traditional extraction');
  return traditionalData;
}
```

Multiple fallback layers:
1. **OpenAI extraction** (highest accuracy)
2. **Traditional parsing** (reliable baseline)  
3. **Pattern matching** (basic extraction)
4. **Manual flagging** (quality control)

## Running the Demo

### Prerequisites
```bash
# Install dependencies
npm install

# Set OpenAI API key
export OPENAI_API_KEY="your-api-key-here"
```

### Run Demonstration
```bash
# Run the interactive demo
npm run demo:openai

# Run unit tests
npm test openai-integration

# Test with your own files
node examples/openai-demo.js your-hvac-file.pdf
```

### Expected Output
```
🤖 OpenAI HVAC Product Extraction Demo
=====================================

📄 Processing mixed format HVAC price list...

✅ EXTRACTION RESULTS:
📊 Products Found: 15
🎯 Confidence: 94.2%
📝 Document Type: price_list

📋 STRUCTURED PRODUCT TABLE:
==================================================================
SKU                 Brand       Type              Capacity    Price     
------------------------------------------------------------------
TUD100C936V2        Allied      furnace           100000 BTU  $3,485    
4HP16L36P-7A        Allied      heat_pump         3 TON       $3,285    
4AC13L24P-7A        Allied      air_conditioner   2 TON       $1,650    
```

## Integration Benefits

### For Users
- **Universal compatibility**: Works with any HVAC data format
- **Time savings**: Automated extraction vs. manual data entry
- **Accuracy improvement**: AI catches details humans miss
- **Comprehensive coverage**: Handles entire HVAC product ecosystem

### For Developers  
- **Reduced maintenance**: No hardcoded parsers to update
- **Extensibility**: Automatically adapts to new product types
- **API consistency**: Uniform output regardless of input format
- **Quality metrics**: Built-in confidence and validation scoring

### For Business
- **Competitive advantage**: Process competitor data faster
- **Data quality**: Structured, validated product information
- **Scalability**: Handle increasing data volumes automatically
- **Cost efficiency**: Reduce manual processing overhead

## Next Steps

1. **Set up OpenAI API key** in environment variables
2. **Test with sample files** using the demo script
3. **Integrate with existing workflow** using FileProcessorService
4. **Customize validation rules** in ProductValidatorService
5. **Scale to production** with batch processing capabilities

The OpenAI integration transforms chaotic HVAC product data into organized, searchable, and actionable information - enabling faster and more accurate competitive analysis and crosswalk creation.