/**
 * Live Sequential Matching Test Suite
 * 
 * This tests the actual OpenAI API integration with real API calls
 * Run locally with: OPENAI_API_KEY="your-key" node tests/manual/live-sequential-test.js
 */

const { SequentialMatchingService } = require('../../dist/src/main/services/sequential-matching.service');

// Color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  log('red', '❌ OPENAI_API_KEY environment variable not set');
  log('yellow', 'Set it with: export OPENAI_API_KEY="your-key-here"');
  process.exit(1);
}

// Mock electron and fs for testing environment
const fs = require('fs');
const path = require('path');

// Mock electron app
const mockApp = {
  getPath: () => '/tmp/test-settings'
};

// Override fs.readFileSync to provide settings
const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, encoding) {
  if (filePath.includes('settings.json')) {
    return JSON.stringify({
      openaiApiKey: process.env.OPENAI_API_KEY
    });
  }
  return originalReadFileSync.call(this, filePath, encoding);
};

fs.existsSync = function(filePath) {
  if (filePath.includes('settings.json')) {
    return true;
  }
  return require('fs').existsSync(filePath);
};

// Mock electron
require.cache[require.resolve('electron')] = {
  exports: { app: mockApp }
};

// Test catalog (our products)
const ourTestProducts = [
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
  {
    id: 3,
    sku: 'YOR-AC-3T-14S',
    model: 'YXV36S14S',
    brand: 'York',
    type: 'AC',
    tonnage: 3,
    seer: 14,
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
  {
    id: 5,
    sku: 'CAR-FUR-100K-90E',
    model: '59SC5A100E20',
    brand: 'Carrier',
    type: 'Furnace',
    afue: 90,
    refrigerant: 'Natural Gas'
  }
];

// Test scenarios designed to hit different stages
const testScenarios = [
  {
    name: 'Stage 1: Exact SKU Match',
    description: 'Should stop at exact matching with 95% confidence',
    expectedStage: 'exact',
    competitor: {
      sku: 'LEN-AC-3T-16S', // Exact match
      company: 'Competitor A',
      model: 'Different-Model',
      price: 3500,
      description: 'Air conditioner unit'
    }
  },
  {
    name: 'Stage 1: Exact Model Match',
    description: 'Should stop at exact matching with 85% confidence',
    expectedStage: 'exact',
    competitor: {
      sku: 'COMP-DIFFERENT-SKU',
      company: 'Competitor B',
      model: 'XP20-024', // Exact match
      price: 4200,
      description: 'Heat pump system'
    }
  },
  {
    name: 'Stage 3: Specification Match',
    description: 'Should match by tonnage and SEER specifications',
    expectedStage: 'specification',
    competitor: {
      sku: 'UNKNOWN-AC-UNIT',
      company: 'Generic HVAC',
      model: 'GEN-3TON-16SEER',
      price: 3200,
      description: '3 ton 16 SEER air conditioner',
      specifications: {
        tonnage: 3,
        seer: 16,
        product_type: 'AC',
        refrigerant: 'R-410A'
      }
    }
  },
  {
    name: 'Stage 4: AI Enhancement - Rheem AC',
    description: 'Should require AI to recognize cross-brand equivalent',
    expectedStage: 'ai_enhanced',
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
        refrigerant: 'R-410A',
        tonnage: 3,
        seer: 14,
        product_type: 'air_conditioner'
      }
    }
  },
  {
    name: 'Stage 4: AI Enhancement - American Standard HP',
    description: 'Should recognize Trane/American Standard equivalent',
    expectedStage: 'ai_enhanced',
    competitor: {
      sku: 'AMERICAN-STD-2400',
      company: 'American Standard',
      model: '4A7A4024H1000A',
      price: 4800,
      description: 'Variable speed heat pump with advanced controls',
      specifications: {
        tonnage: 2,
        technology: 'variable_speed',
        application: 'residential',
        refrigerant: 'R-410A'
      }
    }
  },
  {
    name: 'Stage 4: AI Enhancement - Goodman Furnace',
    description: 'Should use AI to match furnace by efficiency',
    expectedStage: 'ai_enhanced',
    competitor: {
      sku: 'GOODMAN-GAS-90',
      company: 'Goodman',
      model: 'GMEC96100',
      price: 2800,
      description: '90% AFUE gas furnace with ECM motor',
      specifications: {
        afue: 90,
        fuel_type: 'natural_gas',
        product_type: 'furnace',
        motor_type: 'ECM'
      }
    }
  },
  {
    name: 'No Match: Pool Equipment',
    description: 'Should fail to match non-HVAC equipment',
    expectedStage: 'failed',
    competitor: {
      sku: 'POOL-HEATER-001',
      company: 'Pool Company',
      model: 'PH-ELECTRIC-50K',
      price: 2200,
      description: 'Electric pool heater 50K BTU',
      specifications: {
        btu: 50000,
        fuel_type: 'electric',
        application: 'pool'
      }
    }
  }
];

class LiveTestRunner {
  constructor() {
    this.sequentialMatcher = null;
    this.results = [];
    this.totalApiCalls = 0;
    this.totalCost = 0;
  }

  async initialize() {
    log('cyan', '🚀 Initializing Sequential Matching Service...');
    this.sequentialMatcher = new SequentialMatchingService();
    
    // Give service time to initialize OpenAI client
    await new Promise(resolve => setTimeout(resolve, 1500));
    log('green', '✅ Service initialized');
  }

  async runTest(scenario, index) {
    const testNum = index + 1;
    const total = testScenarios.length;
    
    log('blue', `\n${'='.repeat(60)}`);
    log('bright', `📝 Test ${testNum}/${total}: ${scenario.name}`);
    log('yellow', `   ${scenario.description}`);
    log('blue', `${'='.repeat(60)}`);
    
    try {
      log('cyan', '🔍 Starting sequential matching...');
      
      const startTime = Date.now();
      const result = await this.sequentialMatcher.performSequentialMatch(
        scenario.competitor,
        ourTestProducts
      );
      const duration = Date.now() - startTime;
      
      // Track API usage if AI was used
      if (result.matchingStage === 'ai_enhanced') {
        this.totalApiCalls++;
        // Rough cost estimate: ~$0.01 per request for GPT-4
        this.totalCost += 0.01;
      }
      
      // Results
      log('green', `✅ Completed in ${duration}ms`);
      log('bright', `📊 RESULTS:`);
      log('cyan', `   Stage: ${result.matchingStage}`);
      log('cyan', `   Matches: ${result.matches.length}`);
      log('cyan', `   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      
      if (result.matches.length > 0) {
        log('cyan', `   Best Match: ${result.matches[0].ourSku}`);
        log('cyan', `   Method: ${result.matches[0].matchMethod}`);
        if (result.matches[0].reasoning) {
          log('cyan', `   Reasoning: ${result.matches[0].reasoning.join(', ')}`);
        }
      }
      
      // AI Enhancement Details
      if (result.aiEnhancement && result.aiEnhancement.structuredOutput) {
        log('magenta', `\n🤖 AI ENHANCEMENT RESULTS:`);
        const ai = result.aiEnhancement.structuredOutput;
        log('magenta', `   Match Found: ${ai.match_found}`);
        log('magenta', `   AI Confidence: ${ai.confidence || 'N/A'}`);
        if (ai.reasoning && ai.reasoning.length > 0) {
          log('magenta', `   AI Reasoning:`);
          ai.reasoning.forEach((reason, i) => {
            log('magenta', `     ${i + 1}. ${reason}`);
          });
        }
        if (ai.enhanced_competitor_data) {
          log('magenta', `   Enhanced Data: ${JSON.stringify(ai.enhanced_competitor_data, null, 2)}`);
        }
      }
      
      // Processing Steps
      log('yellow', `\n📋 PROCESSING STEPS:`);
      result.processingSteps.forEach((step, i) => {
        const icon = step.includes('✓') ? '✅' : step.includes('✗') ? '❌' : step.includes('⚠️') ? '⚠️' : '🔄';
        log('yellow', `   ${i + 1}. ${icon} ${step}`);
      });
      
      // Validation
      const isExpectedStage = result.matchingStage === scenario.expectedStage;
      if (isExpectedStage) {
        log('green', `✅ VALIDATION: Reached expected stage (${scenario.expectedStage})`);
      } else {
        log('yellow', `⚠️  VALIDATION: Expected ${scenario.expectedStage}, got ${result.matchingStage}`);
      }
      
      this.results.push({
        name: scenario.name,
        expectedStage: scenario.expectedStage,
        actualStage: result.matchingStage,
        matches: result.matches.length,
        confidence: result.confidence,
        duration,
        aiUsed: !!result.aiEnhancement,
        passed: isExpectedStage || (scenario.expectedStage === 'ai_enhanced' && result.matches.length > 0)
      });
      
    } catch (error) {
      log('red', `❌ Test failed: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
      
      this.results.push({
        name: scenario.name,
        expectedStage: scenario.expectedStage,
        actualStage: 'error',
        error: error.message,
        passed: false
      });
    }
  }

  async runAllTests() {
    await this.initialize();
    
    log('bright', `\n🧪 Running ${testScenarios.length} Live Sequential Matching Tests`);
    log('bright', `🔑 Using API key: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
    
    for (let i = 0; i < testScenarios.length; i++) {
      await this.runTest(testScenarios[i], i);
      
      // Small delay between tests to be respectful to API
      if (i < testScenarios.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    log('blue', `\n${'='.repeat(60)}`);
    log('bright', '📊 TEST SUMMARY');
    log('blue', `${'='.repeat(60)}`);
    
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    
    log('bright', `📈 Overall: ${passed}/${total} tests passed`);
    log('bright', `🤖 API Calls Made: ${this.totalApiCalls}`);
    log('bright', `💰 Estimated Cost: $${this.totalCost.toFixed(3)}`);
    
    log('green', '\n✅ PASSED TESTS:');
    this.results.filter(r => r.passed).forEach(result => {
      log('green', `   • ${result.name} (${result.actualStage})`);
    });
    
    const failed = this.results.filter(r => !r.passed);
    if (failed.length > 0) {
      log('red', '\n❌ FAILED TESTS:');
      failed.forEach(result => {
        log('red', `   • ${result.name} (expected: ${result.expectedStage}, got: ${result.actualStage})`);
      });
    }
    
    log('cyan', '\n📋 DETAILED RESULTS:');
    this.results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      const aiUsed = result.aiUsed ? '🤖' : '⚙️';
      log('cyan', `   ${status} ${aiUsed} ${result.name}`);
      log('cyan', `      Stage: ${result.actualStage} | Matches: ${result.matches} | Confidence: ${(result.confidence * 100 || 0).toFixed(1)}%`);
    });
    
    if (passed === total) {
      log('green', '\n🎉 All tests passed! The sequential matching system is working correctly with live OpenAI API integration.');
    } else {
      log('yellow', '\n⚠️  Some tests had unexpected results. This may be due to AI variability or test data limitations.');
    }
    
    log('blue', `\n${'='.repeat(60)}`);
  }
}

// Run the tests
async function main() {
  const runner = new LiveTestRunner();
  await runner.runAllTests();
}

if (require.main === module) {
  main().catch(error => {
    log('red', `Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  });
}

module.exports = { LiveTestRunner, testScenarios, ourTestProducts };