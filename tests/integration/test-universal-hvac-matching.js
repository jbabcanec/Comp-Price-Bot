/**
 * Universal HVAC Matching Test
 * 
 * Tests the system's ability to handle ANY type of HVAC product:
 * - Coils (evaporator, condenser)
 * - Furnaces (gas, oil, electric)
 * - Air handlers and units
 * - Variable speed equipment
 * - Parts and components
 * - Commercial and industrial equipment
 * - Unknown/rare product types
 * 
 * This test reflects real-world HVAC supplier emails that can contain ANYTHING.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { logger } = require('../../dist/main/main/services/logger.service');
const { SuperIntelligentMatcherService } = require('../../dist/main/main/services/superIntelligentMatcher.service');

// Comprehensive HVAC product database (expanded Lennox catalog + generic categories)
const universalHvacCatalog = [
  // Residential AC Units
  { sku: 'XC13-024-230', model: 'XC13-024', type: 'AC', tonnage: 2, seer: 13, brand: 'Lennox', msrp: 2450 },
  { sku: 'XC16-036-230', model: 'XC16-036', type: 'AC', tonnage: 3, seer: 16, brand: 'Lennox', msrp: 3650 },
  { sku: 'XC25-048-230', model: 'XC25-048', type: 'AC', tonnage: 4, seer: 25, brand: 'Lennox', msrp: 6850 },
  
  // Heat Pumps
  { sku: 'XP16-024-230', model: 'XP16-024', type: 'Heat Pump', tonnage: 2, seer: 16, hspf: 9.5, brand: 'Lennox', msrp: 3050 },
  { sku: 'XP20-036-230', model: 'XP20-036', type: 'Heat Pump', tonnage: 3, seer: 20, hspf: 10.0, brand: 'Lennox', msrp: 4450 },
  
  // Furnaces
  { sku: 'EL195E-100-115', model: 'EL195E-100', type: 'Furnace', afue: 95, btu: 100000, brand: 'Lennox', msrp: 2150 },
  { sku: 'SLP98V-070-115', model: 'SLP98V-070', type: 'Furnace', afue: 98.7, btu: 70000, brand: 'Lennox', msrp: 3250 },
  
  // Air Handlers
  { sku: 'CBA27UHV-036', model: 'CBA27UHV-036', type: 'Air Handler', tonnage: 3, cfm: 1200, brand: 'Lennox', msrp: 1950 },
  { sku: 'CBA38MV-024', model: 'CBA38MV-024', type: 'Air Handler', tonnage: 2, cfm: 800, brand: 'Lennox', msrp: 1450 },
  
  // Package Units
  { sku: 'LRP14AC-048', model: 'LRP14AC-048', type: 'Package Unit', tonnage: 4, seer: 14, brand: 'Lennox', msrp: 5450 },
  
  // Coils
  { sku: 'COIL-EVAP-36', model: 'Evap-Coil-36', type: 'Coil', tonnage: 3, subtype: 'evaporator', brand: 'Lennox', msrp: 650 },
  { sku: 'COIL-COND-24', model: 'Cond-Coil-24', type: 'Coil', tonnage: 2, subtype: 'condenser', brand: 'Lennox', msrp: 580 },
  
  // Parts and Components
  { sku: 'PART-COMPRESSOR-24', model: 'Compressor-24K', type: 'Part', subtype: 'compressor', capacity: 24000, brand: 'Lennox', msrp: 850 },
  { sku: 'PART-BLOWER-VAR', model: 'Variable-Blower', type: 'Part', subtype: 'blower', cfm: 1600, brand: 'Lennox', msrp: 320 },
  { sku: 'PART-CONTACTOR-30A', model: 'Contactor-30A', type: 'Part', subtype: 'electrical', amperage: 30, brand: 'Lennox', msrp: 45 },
  
  // Commercial Equipment
  { sku: 'COMM-RTU-10T', model: 'RTU-10-Ton', type: 'Commercial', tonnage: 10, eer: 11.5, brand: 'Lennox', msrp: 12500 },
  { sku: 'COMM-AHU-5000', model: 'AHU-5000CFM', type: 'Commercial', cfm: 5000, brand: 'Lennox', msrp: 4800 },
  
  // Variable Speed Equipment
  { sku: 'VAR-AC-36-INV', model: 'Inverter-AC-36', type: 'AC', tonnage: 3, seer: 22, variable: true, brand: 'Lennox', msrp: 5200 },
  { sku: 'VAR-FURN-120-MOD', model: 'Modulating-Furn-120', type: 'Furnace', btu: 120000, afue: 96, modulating: true, brand: 'Lennox', msrp: 3850 }
];

// Comprehensive test cases covering ALL HVAC product diversity
const universalHvacTestCases = [
  // Standard residential equipment
  {
    name: 'Standard 3-Ton AC Unit',
    competitor: {
      sku: 'CARRIER-3AC16-036',
      company: 'supplier@carrierdealer.com',
      model: '24ACC636A003',
      price: 3400,
      specifications: { tonnage: 3, seer: 16, type: 'AC', refrigerant: 'R-410A' }
    },
    expectedMatch: 'XC16-036-230'
  },
  
  // Heat pump with detailed specs
  {
    name: 'Variable Speed Heat Pump',
    competitor: {
      sku: 'TRANE-XR16-HP',
      company: 'sales@traneparts.com',
      model: '4TWR6036A1000AA',
      price: 4200,
      specifications: { tonnage: 3, seer: 20, hspf: 10.0, type: 'Heat Pump', stages: 'variable' }
    },
    expectedMatch: 'XP20-036-230'
  },
  
  // Oil furnace (specialty heating)
  {
    name: 'Oil Furnace 100K BTU',
    competitor: {
      sku: 'RHEEM-OIL-FURN',
      company: 'orders@rheemdist.com',
      model: 'R95TC0851317MSA',
      price: 2800,
      specifications: { btu: 100000, afue: 85, fuel: 'oil', type: 'Furnace' }
    },
    expectedMatch: 'EL195E-100-115' // Best available match even though it's gas
  },
  
  // Evaporator coil
  {
    name: 'Evaporator Coil 3-Ton',
    competitor: {
      sku: 'GOODMAN-EVAP-36',
      company: 'parts@goodmanair.com',
      model: 'CAPF3636C6',
      price: 720,
      specifications: { tonnage: 3, type: 'Coil', coilType: 'evaporator' }
    },
    expectedMatch: 'COIL-EVAP-36'
  },
  
  // Variable speed blower motor
  {
    name: 'Variable Speed Blower Motor',
    competitor: {
      sku: 'MOTOR-VAR-1HP',
      company: 'motors@hvacparts.com',
      model: 'VAR-SPEED-1200CFM',
      price: 380,
      specifications: { type: 'Part', cfm: 1200, subtype: 'blower', variable: true }
    },
    expectedMatch: 'PART-BLOWER-VAR'
  },
  
  // Commercial rooftop unit
  {
    name: 'Commercial RTU 10-Ton',
    competitor: {
      sku: 'YORK-RTU-10T',
      company: 'commercial@yorkdist.com',
      model: 'YCJF120B40S41A',
      price: 13500,
      specifications: { tonnage: 10, eer: 11.2, type: 'Commercial', application: 'rooftop' }
    },
    expectedMatch: 'COMM-RTU-10T'
  },
  
  // Electrical component
  {
    name: 'Contactor 30 Amp',
    competitor: {
      sku: 'ELECT-CONT-30A',
      company: 'electrical@partsplus.com',
      model: 'CONT-30A-240V',
      price: 52,
      specifications: { type: 'Part', amperage: 30, voltage: 240, subtype: 'electrical' }
    },
    expectedMatch: 'PART-CONTACTOR-30A'
  },
  
  // High-efficiency modulating furnace
  {
    name: 'Modulating Gas Furnace',
    competitor: {
      sku: 'CARRIER-MOD-FURN',
      company: 'hvac@carrierpro.com',
      model: '59MN7A120V21120',
      price: 4100,
      specifications: { btu: 120000, afue: 96, type: 'Furnace', modulating: true }
    },
    expectedMatch: 'VAR-FURN-120-MOD'
  },
  
  // Air handler with ECM motor
  {
    name: 'ECM Air Handler 3-Ton',
    competitor: {
      sku: 'TRANE-AHU-ECM',
      company: 'indoor@traneequip.com',
      model: 'TEM6A0C36H31SA',
      price: 1850,
      specifications: { tonnage: 3, cfm: 1200, type: 'Air Handler', motor: 'ECM' }
    },
    expectedMatch: 'CBA27UHV-036'
  },
  
  // Package heat pump
  {
    name: 'Package Heat Pump',
    competitor: {
      sku: 'RHEEM-PKG-HP',
      company: 'packages@rheemcom.com',
      model: 'RACA-048JKZ',
      price: 5800,
      specifications: { tonnage: 4, seer: 14, type: 'Package Unit', heatType: 'heat pump' }
    },
    expectedMatch: 'LRP14AC-048' // Close match even though it's AC not HP
  },
  
  // Rare/unusual product - should still attempt matching
  {
    name: 'Custom Chiller Component',
    competitor: {
      sku: 'CUSTOM-CHILL-PART',
      company: 'specialty@chillerparts.com',
      model: 'CHILL-EVAP-500T',
      price: 15000,
      specifications: { type: 'Commercial', capacity: 500, application: 'chiller' }
    },
    expectedMatch: null // No good match expected, but should not crash
  },
  
  // International/metric specifications
  {
    name: 'Metric Heat Pump (kW)',
    competitor: {
      sku: 'METRIC-HP-8KW',
      company: 'international@hvacglobal.com',
      model: 'HP-8000W-R32',
      price: 3200,
      specifications: { power: '8kW', refrigerant: 'R-32', type: 'Heat Pump' }
    },
    expectedMatch: 'XP16-024-230' // Approximate match based on power/tonnage conversion
  }
];

class UniversalHvacMatchingTest {
  constructor() {
    this.matcher = new SuperIntelligentMatcherService({
      confidenceThreshold: 0.70, // Lower threshold for diverse products
      enableFuzzyMatching: true,
      enableSpecAnalysis: true,
      enableBrandTranslation: true,
      enableCapacityCorrelation: true,
      enablePriceAnalysis: true,
      enableSemanticMatching: true,
      enablePatternRecognition: true
    });
    
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      confidenceSum: 0,
      processingTimeSum: 0,
      productTypeCoverage: new Set(),
      errors: []
    };
  }

  async runUniversalTests() {
    logger.info('universal-hvac-test', 'Starting universal HVAC matching tests');
    console.log('\\n🌍 UNIVERSAL HVAC MATCHING TEST');
    console.log('===================================');
    console.log(`📦 Testing against ${universalHvacCatalog.length} products`);
    console.log(`🧪 Running ${universalHvacTestCases.length} diverse test cases`);
    console.log('🎯 Evaluating: Coils, Furnaces, AHUs, Variable Speed, Parts, Commercial\\n');

    for (const testCase of universalHvacTestCases) {
      await this.runSingleTest(testCase);
    }

    this.generateUniversalReport();
  }

  async runSingleTest(testCase) {
    const startTime = performance.now();
    
    try {
      this.results.totalTests++;
      
      // Track product type coverage
      const productType = testCase.competitor.specifications?.type || 'Unknown';
      this.results.productTypeCoverage.add(productType);
      
      // Perform super intelligent matching
      const matchResult = await this.matcher.performSuperIntelligentMatch(
        testCase.competitor,
        universalHvacCatalog
      );
      
      const processingTime = performance.now() - startTime;
      this.results.processingTimeSum += processingTime;
      
      const bestMatch = matchResult.bestMatch;
      const confidence = bestMatch ? bestMatch.confidence : 0;
      this.results.confidenceSum += confidence;
      
      // Check if match is correct (if expected)
      const isCorrectMatch = testCase.expectedMatch ? 
        (bestMatch && bestMatch.ourProduct.sku === testCase.expectedMatch) : 
        true; // If no expected match, any reasonable attempt is acceptable
      
      if (isCorrectMatch && confidence >= 0.70) {
        this.results.passed++;
        console.log(`✅ ${testCase.name}`);
        console.log(`   Match: ${bestMatch ? bestMatch.ourProduct.sku : 'None'} | Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`   Methods: [${matchResult.bestMatch?.matchMethods?.join(', ') || 'none'}] | Time: ${processingTime.toFixed(1)}ms\\n`);
      } else {
        this.results.failed++;
        console.log(`❌ ${testCase.name}`);
        console.log(`   Expected: ${testCase.expectedMatch || 'Any reasonable match'}`);
        console.log(`   Got: ${bestMatch ? bestMatch.ourProduct.sku : 'None'} | Confidence: ${(confidence * 100).toFixed(1)}%`);
        console.log(`   Issue: ${!bestMatch ? 'No match found' : confidence < 0.70 ? 'Low confidence' : 'Wrong match'}\\n`);
      }
      
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({
        testCase: testCase.name,
        error: error.message
      });
      
      console.log(`💥 ${testCase.name} - ERROR: ${error.message}\\n`);
      logger.error('universal-hvac-test', `Test failed: ${testCase.name}`, error);
    }
  }

  generateUniversalReport() {
    const avgConfidence = this.results.confidenceSum / this.results.totalTests;
    const avgProcessingTime = this.results.processingTimeSum / this.results.totalTests;
    const successRate = (this.results.passed / this.results.totalTests) * 100;
    
    console.log('\\n🏆 UNIVERSAL HVAC MATCHING RESULTS');
    console.log('===================================');
    console.log(`📊 Success Rate: ${successRate.toFixed(1)}% (${this.results.passed}/${this.results.totalTests})`);
    console.log(`🎯 Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log(`⏱️  Average Processing Time: ${avgProcessingTime.toFixed(1)}ms`);
    console.log(`🌍 Product Type Coverage: ${this.results.productTypeCoverage.size} types`);
    console.log(`   Types Covered: [${Array.from(this.results.productTypeCoverage).join(', ')}]`);
    
    if (this.results.errors.length > 0) {
      console.log('\\n⚠️  ERRORS:');
      this.results.errors.forEach(error => {
        console.log(`   ${error.testCase}: ${error.error}`);
      });
    }
    
    // System verdict
    console.log('\\n🚀 SYSTEM VERDICT:');
    if (successRate >= 85 && avgConfidence >= 0.80) {
      console.log('   ✅ EXCELLENT! Universal HVAC matching is production-ready');
      console.log('   🌟 System handles diverse product types with high accuracy');
    } else if (successRate >= 70 && avgConfidence >= 0.70) {
      console.log('   ⚡ GOOD! System shows strong universal matching capability');
      console.log('   🔧 Minor improvements recommended for edge cases');
    } else {
      console.log('   ⚠️  NEEDS WORK! Universal matching requires enhancement');
      console.log('   🔨 Focus on improving flexibility for diverse product types');
    }
    
    logger.info('universal-hvac-test', 'Universal HVAC matching test completed', {
      successRate: successRate.toFixed(1),
      avgConfidence: (avgConfidence * 100).toFixed(1),
      avgProcessingTime: avgProcessingTime.toFixed(1),
      productTypeCoverage: this.results.productTypeCoverage.size,
      errors: this.results.errors.length
    });

    // Exit with appropriate code
    process.exit(successRate >= 70 ? 0 : 1);
  }
}

// Run the universal test
async function runUniversalTest() {
  try {
    const testSuite = new UniversalHvacMatchingTest();
    await testSuite.runUniversalTests();
  } catch (error) {
    console.error('\\n💥 UNIVERSAL HVAC TEST SUITE FAILED');
    console.error('Error:', error.message);
    logger.error('universal-hvac-test', 'Test suite failed', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runUniversalTest();
}

module.exports = { UniversalHvacMatchingTest };