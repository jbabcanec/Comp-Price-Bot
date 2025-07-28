/**
 * Manual Live API Test - Run this locally with your API key
 * 
 * SECURITY NOTE: Never commit API keys to version control!
 * 
 * To run this test:
 * 1. Set environment variable: export OPENAI_API_KEY="your-key-here"
 * 2. Run: node tests/manual/live-api-test.js
 */

const { SequentialMatchingService } = require('../../dist/src/main/services/sequential-matching.service');

// Check for API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Please set OPENAI_API_KEY environment variable');
  console.log('Example: export OPENAI_API_KEY="sk-..."');
  process.exit(1);
}

// Mock electron app for testing
process.env.NODE_ENV = 'test';
const mockApp = {
  getPath: () => '/tmp/test-settings'
};

// Mock fs for settings
const fs = require('fs');
const path = require('path');
const originalReadFileSync = fs.readFileSync;

fs.readFileSync = function(filePath, encoding) {
  if (filePath.includes('settings.json')) {
    return JSON.stringify({
      openaiApiKey: process.env.OPENAI_API_KEY
    });
  }
  return originalReadFileSync.call(this, filePath, encoding);
};

// Mock electron
require.cache[require.resolve('electron')] = {
  exports: { app: mockApp }
};

const testScenarios = [
  {
    name: 'Rheem AC Unit (should trigger AI)',
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
        product_type: 'AC'
      }
    }
  },
  {
    name: 'Exact SKU Match (should stop at stage 1)',
    competitor: {
      sku: 'LEN-AC-3T-16S',
      company: 'Test Company',
      model: 'Different-Model',
      price: 3500,
      description: 'Air conditioner unit'
    }
  }
];

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
    sku: 'YOR-AC-3T-14S',
    model: 'YXV36S14S',
    brand: 'York',
    type: 'AC',
    tonnage: 3,
    seer: 14,
    refrigerant: 'R-410A'
  },
  {
    id: 3,
    sku: 'GOO-HP-2T-16S',
    model: 'GSZ140241',
    brand: 'Goodman',
    type: 'Heat Pump',
    tonnage: 2,
    seer: 16,
    refrigerant: 'R-410A'
  }
];

async function runLiveTests() {
  console.log('🚀 Starting Live OpenAI API Integration Tests\n');
  console.log('🔑 Using API key:', process.env.OPENAI_API_KEY.substring(0, 20) + '...\n');

  for (const scenario of testScenarios) {
    console.log(`\n📝 Testing: ${scenario.name}`);
    console.log('=' .repeat(50));
    
    try {
      const matcher = new SequentialMatchingService();
      
      // Give service time to initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('🔍 Starting sequential matching...');
      const startTime = Date.now();
      
      const result = await matcher.performSequentialMatch(scenario.competitor, ourTestProducts);
      
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Completed in ${duration}ms`);
      console.log(`📊 Stage: ${result.matchingStage}`);
      console.log(`📊 Matches: ${result.matches.length}`);
      console.log(`📊 Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      
      if (result.matches.length > 0) {
        console.log(`📊 Best match: ${result.matches[0].ourSku}`);
        console.log(`📊 Method: ${result.matches[0].matchMethod}`);
        if (result.matches[0].reasoning) {
          console.log(`📊 Reasoning: ${result.matches[0].reasoning.join(', ')}`);
        }
      }
      
      if (result.aiEnhancement) {
        console.log('\n🤖 AI Enhancement Results:');
        console.log('   Match found:', result.aiEnhancement.structuredOutput.match_found);
        console.log('   Confidence:', result.aiEnhancement.structuredOutput.confidence);
        if (result.aiEnhancement.structuredOutput.reasoning) {
          console.log('   AI Reasoning:');
          result.aiEnhancement.structuredOutput.reasoning.forEach((reason, i) => {
            console.log(`     ${i + 1}. ${reason}`);
          });
        }
      }
      
      console.log('\n📋 Processing Steps:');
      result.processingSteps.forEach((step, i) => {
        const icon = step.includes('✓') ? '✅' : step.includes('✗') ? '❌' : '🔄';
        console.log(`   ${icon} ${step}`);
      });
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      if (error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
  }
  
  console.log('\n🎉 Live API testing completed!');
}

// Run if called directly
if (require.main === module) {
  runLiveTests().catch(console.error);
}

module.exports = { runLiveTests };