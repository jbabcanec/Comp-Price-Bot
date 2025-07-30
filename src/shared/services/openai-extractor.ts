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
You are an expert HVAC industry analyst and data extraction specialist with 20+ years of experience in commercial and residential HVAC systems. Your task is to analyze the provided content (which may be from PDFs, images, spreadsheets, or emails) and extract ALL HVAC product information into a structured format.

IMPORTANT: This content could contain ANY type of HVAC equipment including:
- Air conditioners, heat pumps, furnaces (gas/oil/electric)  
- Air handlers, coils (evaporator/condenser), ductwork
- Commercial RTUs, chillers, boilers, VRF systems
- Parts and components (compressors, motors, controls, contactors)
- Variable speed/modulating equipment, smart thermostats
- Industrial equipment, custom installations, retrofit kits

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

export type AttachmentSourceType = 'pdf' | 'image' | 'excel' | 'email' | 'generic';

export class OpenAIProductExtractor {
  private apiKey: string;
  private model: string = 'gpt-4-turbo-preview';
  private visionModel: string = 'gpt-4-vision-preview';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get specialized prompt based on content source type
   */
  private getSpecializedPrompt(sourceType: AttachmentSourceType = 'generic'): string {
    const basePrompt = OPENAI_EXTRACTION_PROMPT;
    
    const specializationMap = {
      pdf: `
**PDF DOCUMENT ANALYSIS**: This content is from a PDF document (likely a specification sheet, catalog, or manual).
- Look for detailed technical specifications in tables and formatted sections
- Extract model numbers from headers, part lists, and specification tables  
- Pay attention to series/family groupings and option codes
- Watch for footnotes and specification notes that affect pricing/availability`,

      image: `
**IMAGE/OCR ANALYSIS**: This content is from OCR processing of an image (likely equipment nameplate, catalog page, or technical drawing).
- Text may be fragmented or have OCR errors - use context to reconstruct accurate data
- Equipment nameplates typically show: Model, Serial, Voltage, Amperage, Capacity, Refrigerant
- Catalog images may show model families with specifications in tables
- Be especially careful with similar-looking characters (0/O, 1/I, 5/S, etc.)`,

      excel: `
**SPREADSHEET ANALYSIS**: This content is from Excel/CSV data with structured columns.
- Data is likely pre-organized in columns (SKU, Model, Price, Specs, etc.)
- Look for header rows to understand column meanings
- Watch for merged cells, subtotals, and section breaks
- Price columns may include different types (List, Dealer, MSRP, etc.)`,

      email: `
**EMAIL CONTENT ANALYSIS**: This content is from email body text or HTML.
- Products may be embedded in conversational text or formatted lists
- Look for quoted previous emails with different formatting
- Pricing may be informal ("around $2,500") or in bulk ("$1,200 each for qty 10+")
- Watch for context clues about availability, lead times, or special conditions`,

      generic: ''
    };

    return basePrompt + specializationMap[sourceType];
  }

  /**
   * Extract product data from images using GPT-4 Vision API
   */
  async extractProductsFromImage(imageUrl: string | Buffer, sourceType: 'nameplate' | 'catalog' | 'schematic' | 'generic' = 'nameplate'): Promise<OpenAIProductSchema> {
    const visionPrompt = this.getVisionPrompt(sourceType);
    
    // Prepare image content
    let imageContent;
    if (Buffer.isBuffer(imageUrl)) {
      // Convert buffer to base64
      const base64Image = imageUrl.toString('base64');
      imageContent = {
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64Image}`,
          detail: "high" // High detail for technical equipment images
        }
      };
    } else {
      imageContent = {
        type: "image_url",
        image_url: {
          url: imageUrl,
          detail: "high"
        }
      };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.visionModel,
        max_tokens: 4096,
        messages: [
          {
            role: 'system',
            content: visionPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: "text",
                text: "Analyze this HVAC equipment image and extract all product information:"
              },
              imageContent
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI Vision API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return JSON.parse(result.choices[0].message.content);
  }

  /**
   * Hybrid approach: Try Vision API first, fallback to OCR + text extraction
   */
  async extractProductsFromImageWithFallback(imageBuffer: Buffer, ocrText?: string): Promise<OpenAIProductSchema> {
    try {
      // Primary: Use Vision API
      return await this.extractProductsFromImage(imageBuffer, 'nameplate');
    } catch (error) {
      console.warn('Vision API failed, falling back to OCR + text extraction:', (error as Error).message);
      
      if (ocrText) {
        // Fallback: Use OCR text with specialized image prompt
        return await this.extractProducts(ocrText, 'image');
      } else {
        throw new Error('Both Vision API and OCR fallback failed');
      }
    }
  }

  /**
   * Get specialized vision prompts for different image types
   */
  private getVisionPrompt(imageType: 'nameplate' | 'catalog' | 'schematic' | 'generic'): string {
    const basePrompt = `You are an expert HVAC technician and data analyst. Analyze this image and extract ALL visible HVAC product information into structured JSON format.

CRITICAL: Return valid JSON only. Do not include any text outside the JSON structure.`;

    const visionPrompts = {
      nameplate: `${basePrompt}

**EQUIPMENT NAMEPLATE ANALYSIS**:
This is likely an equipment nameplate/data plate showing technical specifications.

FOCUS ON:
- Model number (often prominently displayed)
- Serial number
- Electrical specifications (Voltage, Amperage, Phase, Frequency)
- Capacity ratings (BTU, Tonnage, CFM)
- Efficiency ratings (SEER, EER, AFUE, HSPF)
- Refrigerant type (R-410A, R-22, etc.)
- Manufacturing date/year
- Brand/manufacturer name
- Certification marks (UL, ETL, AHRI, etc.)

IMPORTANT:
- Read ALL text carefully, including small print
- Equipment nameplates contain the most accurate technical data
- Look for numbers that might be partially obscured or at angles
- Model numbers often contain capacity/efficiency codes`,

      catalog: `${basePrompt}

**PRODUCT CATALOG ANALYSIS**:
This appears to be a catalog page or product specification sheet.

FOCUS ON:
- Product families and model variations
- Specification tables and charts
- Pricing information if visible
- Feature lists and bullet points
- Installation diagrams
- Performance data tables
- Accessory and option codes

IMPORTANT:
- Catalog pages often show multiple related products
- Look for model number patterns and series information
- Extract all variants and configurations shown`,

      schematic: `${basePrompt}

**TECHNICAL SCHEMATIC ANALYSIS**:
This appears to be a technical drawing, wiring diagram, or system schematic.

FOCUS ON:
- Part numbers and component labels
- Electrical specifications and connections
- System capacities and ratings
- Installation requirements
- Dimensional information
- Control sequences and logic

IMPORTANT:
- Technical drawings contain precise engineering data
- Component part numbers are often shown in detail views
- Look for revision numbers and drawing dates`,

      generic: `${basePrompt}

**GENERAL HVAC IMAGE ANALYSIS**:
Analyze this HVAC-related image for any product information.

FOCUS ON:
- Any visible text, labels, or markings
- Product identifiers and part numbers
- Technical specifications if visible
- Brand names and logos
- Equipment type identification`
    };

    return visionPrompts[imageType];
  }

  /**
   * Extract structured product data from any text content with specialized prompts
   */
  async extractProducts(content: string, sourceType: AttachmentSourceType = 'generic'): Promise<OpenAIProductSchema> {
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
            content: this.getSpecializedPrompt(sourceType)
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
   * Process batch of content chunks with source type awareness (for large documents)
   */
  async extractProductsBatch(
    contentChunks: string[], 
    sourceType: AttachmentSourceType = 'generic'
  ): Promise<OpenAIProductSchema[]> {
    const promises = contentChunks.map(chunk => this.extractProducts(chunk, sourceType));
    return Promise.all(promises);
  }

  /**
   * Process mixed attachment types with appropriate specialized prompts
   */
  async extractFromAttachments(attachments: Array<{
    content: string;
    filename: string;
    contentType: string;
  }>): Promise<OpenAIProductSchema[]> {
    const promises = attachments.map(attachment => {
      // Determine source type from filename/content type
      const sourceType = this.determineSourceType(attachment.filename, attachment.contentType);
      return this.extractProducts(attachment.content, sourceType);
    });
    return Promise.all(promises);
  }

  /**
   * Intelligently determine source type from file information
   */
  private determineSourceType(filename: string, contentType: string): AttachmentSourceType {
    const ext = filename.toLowerCase().split('.').pop() || '';
    
    if (['pdf'].includes(ext) || contentType.includes('pdf')) {
      return 'pdf';
    }
    
    if (['jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'].includes(ext) || contentType.includes('image')) {
      return 'image';
    }
    
    if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || contentType.includes('spreadsheet') || contentType.includes('csv')) {
      return 'excel';
    }
    
    if (contentType.includes('text/html') || filename.includes('email') || contentType.includes('message')) {
      return 'email';
    }
    
    return 'generic';
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