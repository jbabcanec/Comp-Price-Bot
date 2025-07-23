/**
 * OpenAI-Powered Universal HVAC Product Extraction
 * Uses GPT-4 to extract structured data from ANY input format
 */

export interface OpenAIProductSchema {
  products: Array<{
    // Core identifiers
    sku: string;
    model?: string;
    brand?: string;
    manufacturer?: string;
    
    // Product classification
    product_type: string;
    category?: string;
    subcategory?: string;
    application?: string; // residential, commercial, industrial
    
    // Specifications (completely dynamic)
    specifications: {
      capacity?: {
        value: number;
        unit: string; // BTU, TON, KW, CFM, etc.
      };
      efficiency?: Array<{
        type: string; // SEER, EER, AFUE, HSPF, COP, etc.
        value: number;
        unit?: string;
      }>;
      electrical?: {
        voltage?: number;
        amperage?: number;
        phase?: number;
        frequency?: number;
      };
      physical?: {
        dimensions?: string;
        weight?: { value: number; unit: string };
      };
      operating_conditions?: {
        temperature_range?: string;
        pressure?: { value: number; unit: string };
        flow_rate?: { value: number; unit: string };
      };
      refrigerant?: string;
      fuel_type?: string;
      features?: string[];
    };
    
    // Pricing
    price?: {
      value: number;
      currency: string;
      type: string; // MSRP, list, dealer, etc.
    };
    
    // Metadata
    description?: string;
    part_numbers?: string[];
    compatibility?: string[];
    certifications?: string[];
    
    // Confidence scoring
    confidence: number; // 0-1 scale
    extraction_notes?: string[];
  }>;
  
  // Processing metadata
  source_analysis: {
    document_type: string;
    total_products_found: number;
    extraction_confidence: number;
    processing_notes: string[];
  };
}

export const OPENAI_EXTRACTION_PROMPT = `
You are an expert HVAC industry analyst and data extraction specialist. Your task is to analyze the provided content and extract ALL HVAC product information into a structured format.

## ANALYSIS REQUIREMENTS:

1. **COMPREHENSIVE EXTRACTION**: Find every HVAC product, part, component, or accessory mentioned
2. **UNIVERSAL COVERAGE**: Handle residential, commercial, industrial equipment
3. **NO ASSUMPTIONS**: Only extract what's explicitly stated or clearly implied
4. **DYNAMIC SPECIFICATIONS**: Capture ANY specification type (BTU, CFM, tonnage, SEER, voltage, etc.)
5. **CONTEXT AWARENESS**: Use surrounding text to improve accuracy

## PRODUCT CATEGORIES TO IDENTIFY:
- Heating: Furnaces, boilers, heat pumps, unit heaters, radiant systems
- Cooling: Air conditioners, chillers, cooling towers, evaporative coolers
- Air Systems: AHUs, fans, blowers, ventilation equipment
- Package Units: Rooftop units, magic pak, all-in-one systems, split systems
- Components: Coils, filters, dampers, controls, valves, motors, compressors
- Parts & Accessories: Any replacement parts, accessories, or components

## SPECIFICATION EXTRACTION:
Extract ANY numerical specification with its unit and context:
- Capacity: BTU, tons, KW, CFM, GPM, etc.
- Efficiency: SEER, EER, AFUE, HSPF, COP, efficiency percentages
- Electrical: Voltage, amperage, phase, frequency, power consumption
- Physical: Dimensions (LxWxH), weight, footprint
- Operating: Temperature range, pressure, flow rates, static pressure
- Performance: Sound levels, refrigerant type, fuel type

## OUTPUT REQUIREMENTS:

Return a JSON object matching the OpenAIProductSchema interface. For each product:

1. **Core Identification**: Extract SKU/model/part number and brand/manufacturer
2. **Product Classification**: Identify the primary product type and category
3. **Dynamic Specifications**: Capture ALL specifications with proper units
4. **Pricing Information**: Extract any pricing data with currency and type
5. **Confidence Scoring**: Rate extraction confidence (0-1) based on data clarity

## EXAMPLES:

Input: "Lennox XR16-024-230 2 Ton 16 SEER Air Conditioner $2,850"
Output: {
  sku: "XR16-024-230",
  brand: "Lennox", 
  product_type: "air_conditioner",
  specifications: {
    capacity: { value: 2, unit: "TON" },
    efficiency: [{ type: "SEER", value: 16 }]
  },
  price: { value: 2850, currency: "USD", type: "unknown" },
  confidence: 0.95
}

## IMPORTANT GUIDELINES:
- If unsure about a specification, include it with lower confidence
- Capture partial information rather than skipping products
- Use context clues to infer missing information when reasonable
- Include extraction notes for any assumptions or unclear data
- Handle multiple product formats in the same document
- Extract from tables, lists, paragraphs, and mixed formats

Analyze the following content and extract all HVAC product data:
`;

export class OpenAIProductExtractor {
  private apiKey: string;
  private model: string = 'gpt-4-turbo-preview';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Extract structured product data from any text content
   */
  async extractProducts(content: string): Promise<OpenAIProductSchema> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: OPENAI_EXTRACTION_PROMPT
          },
          {
            role: 'user',
            content: content
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }

  /**
   * Process batch of content chunks (for large documents)
   */
  async extractProductsBatch(contentChunks: string[]): Promise<OpenAIProductSchema[]> {
    const promises = contentChunks.map(chunk => this.extractProducts(chunk));
    return Promise.all(promises);
  }

  /**
   * Merge multiple extraction results
   */
  mergeExtractionResults(results: OpenAIProductSchema[]): OpenAIProductSchema {
    const allProducts = results.flatMap(r => r.products);
    
    // Deduplicate by SKU
    const uniqueProducts = allProducts.filter((product, index, array) => 
      array.findIndex(p => p.sku === product.sku) === index
    );

    return {
      products: uniqueProducts,
      source_analysis: {
        document_type: 'batch_processed',
        total_products_found: uniqueProducts.length,
        extraction_confidence: results.reduce((sum, r) => sum + r.source_analysis.extraction_confidence, 0) / results.length,
        processing_notes: results.flatMap(r => r.source_analysis.processing_notes)
      }
    };
  }
}