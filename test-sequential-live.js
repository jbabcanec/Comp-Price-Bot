/**
 * Live Test Script for Sequential Matching with Real OpenAI API
 * Run this manually to test actual API integration
 */

const { SequentialMatchingService } = require('./dist/src/main/services/sequential-matching.service');

// Test data
const testCompetitor = {
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
    seer: 14
  }
};

const testOurProducts = [
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
  }
];

async function testLiveMatching() {
  console.log('🚀 Starting Live Sequential Matching Test...\n');
  
  try {
    const matcher = new SequentialMatchingService();
    
    // Give service time to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('📝 Testing competitor product:');
    console.log(JSON.stringify(testCompetitor, null, 2));
    console.log('\n🔍 Starting sequential matching...\n');
    
    const result = await matcher.performSequentialMatch(testCompetitor, testOurProducts);
    
    console.log('✅ Matching completed!');
    console.log('📊 Results:');
    console.log(`   Stage: ${result.matchingStage}`);
    console.log(`   Matches found: ${result.matches.length}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    
    if (result.matches.length > 0) {
      console.log(`   Best match: ${result.matches[0].ourSku}`);
      console.log(`   Method: ${result.matches[0].matchMethod}`);
      console.log(`   Reasoning: ${result.matches[0].reasoning?.join(', ')}`);
    }
    
    if (result.aiEnhancement) {
      console.log('\n🤖 AI Enhancement Results:');
      console.log(JSON.stringify(result.aiEnhancement.structuredOutput, null, 2));
    }
    
    console.log('\n📋 Processing Steps:');
    result.processingSteps.forEach((step, i) => {
      console.log(`   ${i + 1}. ${step}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('API key')) {
      console.log('\n💡 To fix this:');
      console.log('1. Make sure your OpenAI API key is in settings.json');
      console.log('2. Ensure the app has been built: npm run build');
      console.log('3. Check that settings.json is in the correct location');
    }
  }
}

// Run the test
testLiveMatching();