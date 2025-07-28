/**
 * Test data for Sequential Matching System
 * Contains scenarios for each stage of the fallback chain
 */

import { CompetitorProduct, OurProduct } from '@shared/types/matching.types';

// Our catalog products for testing
export const ourTestProducts: OurProduct[] = [
  // Exact match scenarios
  {
    id: 1,
    sku: 'LEN-AC-3T-16S',
    model: 'XC16-036-230',
    brand: 'Lennox',
    type: 'AC',
    tonnage: 3,
    seer: 16,
    refrigerant: 'R-410A'
  },
  {
    id: 2,
    sku: 'LEN-HP-2T-20S',
    model: 'XP20-024',
    brand: 'Lennox',
    type: 'Heat Pump',
    tonnage: 2,
    seer: 20,
    refrigerant: 'R-410A'
  },
  
  // Fuzzy match scenarios
  {
    id: 3,
    sku: 'CAR-AC-25T-13S',
    model: '25HCB330A300',
    brand: 'Carrier',
    type: 'AC',
    tonnage: 2.5,
    seer: 13,
    refrigerant: 'R-410A'
  },
  {
    id: 4,
    sku: 'TRA-HP-4T-16S',
    model: '4TWR6048H1000A',
    brand: 'Trane',
    type: 'Heat Pump',
    tonnage: 4,
    seer: 16,
    refrigerant: 'R-410A'
  },
  
  // Specification match scenarios
  {
    id: 5,
    sku: 'LEN-FUR-80K-95E',
    model: 'EL296V070C36B',
    brand: 'Lennox',
    type: 'Furnace',
    afue: 95,
    refrigerant: 'Natural Gas'
  },
  {
    id: 6,
    sku: 'CAR-FUR-100K-90E',
    model: '59SC5A100E20',
    brand: 'Carrier',
    type: 'Furnace',
    afue: 90,
    refrigerant: 'Natural Gas'
  },
  
  // AI enhancement scenarios - similar but not exact
  {
    id: 7,
    sku: 'YOR-AC-3T-14S',
    model: 'YXV36S14S',
    brand: 'York',
    type: 'AC',
    tonnage: 3,
    seer: 14,
    refrigerant: 'R-410A'
  },
  {
    id: 8,
    sku: 'GOO-HP-2T-16S', 
    model: 'GSZ140241',
    brand: 'Goodman',
    type: 'Heat Pump',
    tonnage: 2,
    seer: 16,
    refrigerant: 'R-410A'
  }
];

// Test scenarios for each matching stage
export const testScenarios = {
  
  // Stage 1: Exact SKU/Model matches (should succeed at stage 1)
  exactMatches: [
    {
      name: 'Exact SKU Match',
      competitor: {
        sku: 'LEN-AC-3T-16S', // Exact match with ourTestProducts[0]
        company: 'Competitor A',
        model: 'Different-Model',
        price: 3500,
        description: 'Air conditioner unit'
      } as CompetitorProduct,
      expectedStage: 'exact' as const,
      expectedConfidence: 0.95,
      expectedMatch: 'LEN-AC-3T-16S'
    },
    {
      name: 'Exact Model Match',
      competitor: {
        sku: 'COMP-DIFFERENT-SKU',
        company: 'Competitor B', 
        model: 'XP20-024', // Exact match with ourTestProducts[1]
        price: 4200,
        description: 'Heat pump system'
      } as CompetitorProduct,
      expectedStage: 'exact' as const,
      expectedConfidence: 0.85,
      expectedMatch: 'LEN-HP-2T-20S'
    }
  ],

  // Stage 2: Fuzzy matches (should succeed at stage 2)
  fuzzyMatches: [
    {
      name: 'Similar Model Fuzzy Match',
      competitor: {
        sku: 'CAR-AC-25T-13S-SIMILAR', // Very similar to CAR-AC-25T-13S
        company: 'Competitor C',
        model: '25HCB330A300-ALT', // Very similar to 25HCB330A300
        price: 2800,
        description: 'Central air conditioning'
      } as CompetitorProduct,
      expectedStage: 'fuzzy' as const,
      minConfidence: 0.6,
      expectedMatch: 'CAR-AC-25T-13S'
    },
    {
      name: 'Similar Brand and Model',
      competitor: {
        sku: 'TRA-HP-4T-16S-V2', // Very similar to TRA-HP-4T-16S
        company: 'Trane',
        model: '4TWR6048H1000B', // Very similar to 4TWR6048H1000A
        price: 5200,
        description: 'Trane heat pump'
      } as CompetitorProduct,
      expectedStage: 'fuzzy' as const,
      minConfidence: 0.6,
      expectedMatch: 'TRA-HP-4T-16S'
    }
  ],

  // Stage 3: Specification-based matches (should succeed at stage 3)
  specificationMatches: [
    {
      name: 'Tonnage and SEER Match',
      competitor: {
        sku: 'UNKNOWN-AC-UNIT',
        company: 'Unknown Brand',
        model: 'UNK-3TON-16SEER',
        price: 3200,
        description: '3 ton 16 SEER air conditioner',
        specifications: {
          tonnage: 3,
          seer: 16,
          product_type: 'AC',
          refrigerant: 'R-410A'
        }
      } as CompetitorProduct,
      expectedStage: 'specification' as const,
      minConfidence: 0.6,
      expectedMatch: 'LEN-AC-3T-16S'
    },
    {
      name: 'AFUE Match for Furnace',
      competitor: {
        sku: 'MYSTERY-FURNACE',
        company: 'Generic HVAC',
        model: 'GEN-95-AFUE',
        price: 2800,
        description: '95% AFUE furnace',
        specifications: {
          afue: 95,
          product_type: 'Furnace',
          fuel_type: 'Natural Gas'
        }
      } as CompetitorProduct,
      expectedStage: 'specification' as const,
      minConfidence: 0.6,
      expectedMatch: 'LEN-FUR-80K-95E'
    }
  ],

  // Stage 4: AI enhancement scenarios (complex cases requiring AI)
  aiEnhancementScenarios: [
    {
      name: 'Cross-Brand Equivalent Recognition',
      competitor: {
        sku: 'RHEEM-CLASSIC-36',
        company: 'Rheem',
        model: 'RPQG-JEC036JK',
        price: 3400,
        description: 'Rheem 3 ton 14 SEER air conditioner with scroll compressor',
        specifications: {
          capacity: '36000 BTU',
          efficiency: '14 SEER',
          compressor_type: 'scroll',
          refrigerant: 'R-410A'
        }
      } as CompetitorProduct,
      expectedStage: 'ai_enhanced' as const,
      expectedAI: true,
      description: 'Should recognize equivalent 3-ton AC units across different brands'
    },
    {
      name: 'Complex Model Pattern Recognition',
      competitor: {
        sku: 'AMERICAN-STD-2400',
        company: 'American Standard',
        model: '4A7A4024H1000A',
        price: 4800,
        description: 'Variable speed heat pump with advanced controls',
        specifications: {
          tonnage: 2,
          technology: 'variable_speed',
          application: 'residential'
        }
      } as CompetitorProduct,
      expectedStage: 'ai_enhanced' as const,
      expectedAI: true,
      description: 'Should recognize Trane/American Standard equivalent models'
    }
  ],

  // Stage 5: Web research scenarios (truly difficult cases)
  webResearchScenarios: [
    {
      name: 'Obscure Foreign Brand',
      competitor: {
        sku: 'MITSUBISHI-MSZ-001',
        company: 'Mitsubishi Electric',
        model: 'MSZ-GL15NA-U1',
        price: 1800,
        description: 'Ductless mini-split system'
      } as CompetitorProduct,
      expectedStage: 'web_research' as const,
      description: 'Should require web research for specialized equipment'
    }
  ],

  // Failed scenarios (no match expected)
  noMatchScenarios: [
    {
      name: 'Completely Different Product',
      competitor: {
        sku: 'POOL-HEATER-001',
        company: 'Pool Company',
        model: 'PH-ELECTRIC-50K',
        price: 2200,
        description: 'Electric pool heater 50K BTU'
      } as CompetitorProduct,
      expectedStage: 'failed' as const,
      description: 'Pool heater should not match HVAC equipment'
    }
  ]
};

// Mock AI responses for testing
export const mockAIResponses = {
  successfulMatch: {
    match_found: true,
    matched_sku: 'YOR-AC-3T-14S',
    confidence: 0.78,
    reasoning: [
      'Both are 3-ton residential air conditioning units',
      'Similar SEER ratings (14 vs 16) within acceptable range',
      'Compatible refrigerant types (R-410A)',
      'Equivalent capacity and application'
    ],
    enhanced_competitor_data: {
      identified_specifications: {
        tonnage: '3',
        seer: '14',
        product_type: 'air_conditioner'
      },
      product_category: 'cooling',
      key_features: ['scroll_compressor', 'residential_application']
    }
  },
  
  noMatch: {
    match_found: false,
    matched_sku: null,
    confidence: 0.1,
    reasoning: [
      'Product is pool heating equipment, not HVAC',
      'No equivalent products in HVAC catalog',
      'Different application and technology'
    ],
    enhanced_competitor_data: {
      identified_specifications: {
        product_type: 'pool_heater',
        fuel_type: 'electric'
      },
      product_category: 'pool_equipment',
      key_features: ['electric_element', 'pool_application']
    }
  }
};

// Test configuration
export const testConfig = {
  minimumConfidenceThreshold: 0.6,
  fuzzyMatchThreshold: 0.7,
  aiTimeoutMs: 10000,
  maxRetries: 3
};

// Expected processing steps for verification
export const expectedProcessingSteps = {
  exactMatch: [
    'Stage 1: Attempting exact SKU/Model match',
    '✓ Exact match found with 95.0% confidence'
  ],
  
  fuzzyMatch: [
    'Stage 1: Attempting exact SKU/Model match',
    '✗ No high-confidence exact match found',
    'Stage 2: Attempting fuzzy matching',
    '✓ Fuzzy match found with'
  ],
  
  specificationMatch: [
    'Stage 1: Attempting exact SKU/Model match',
    '✗ No high-confidence exact match found', 
    'Stage 2: Attempting fuzzy matching',
    '✗ No high-confidence fuzzy match found',
    'Stage 3: Attempting specification-based matching',
    '✓ Specification match found with'
  ],
  
  aiMatch: [
    'Stage 1: Attempting exact SKU/Model match',
    '✗ No high-confidence exact match found',
    'Stage 2: Attempting fuzzy matching', 
    '✗ No high-confidence fuzzy match found',
    'Stage 3: Attempting specification-based matching',
    '✗ No high-confidence specification match found',
    'Stage 4: Attempting AI-enhanced matching using HVAC knowledge',
    '✓ AI enhancement found match with'
  ],
  
  noMatch: [
    'Stage 1: Attempting exact SKU/Model match',
    '✗ No high-confidence exact match found',
    'Stage 2: Attempting fuzzy matching',
    '✗ No high-confidence fuzzy match found', 
    'Stage 3: Attempting specification-based matching',
    '✗ No high-confidence specification match found',
    'Stage 4: Attempting AI-enhanced matching using HVAC knowledge',
    '✗ AI enhancement could not find a match',
    'Stage 5: Attempting web research enhancement as final fallback',
    '✗ Web research did not improve matching',
    '✗ No matches found after all stages'
  ]
};