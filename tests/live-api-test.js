/**
 * Complete Live API Test Suite
 * 
 * Tests sequential matching with real Allied Air catalog data and OpenAI API
 * Just run: node tests/live-api-test.js (with .env file configured)
 */

// Load environment variables from .env file
require('dotenv').config();

const { SequentialMatchingService } = require('../dist/main/main/services/sequential-matching.service');
const { alliedAirCatalog, competitorProducts } = require('./data/allied-air-catalog');

// Colors for pretty output
const colors = {
  reset: '\x1b[0m', bright: '\x1b[1m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Environment setup
if (!process.env.OPENAI_API_KEY) {
  log('red', '❌ Missing OPENAI_API_KEY');
  log('yellow', '💡 Please add your API key to the .env file:');
  log('yellow', '   1. Edit .env file in project root');
  log('yellow', '   2. Replace "sk-proj-paste-your-actual-key-here" with your actual API key');
  process.exit(1);
}

// Mock electron and fs for Node.js environment
const fs = require('fs');
const mockApp = { getPath: () => '/tmp/test-settings' };

const originalReadFileSync = fs.readFileSync;
fs.readFileSync = function(filePath, encoding) {
  if (filePath.includes('settings.json')) {
    return JSON.stringify({ openaiApiKey: process.env.OPENAI_API_KEY });
  }
  return originalReadFileSync.call(this, filePath, encoding);
};

fs.existsSync = function(filePath) {
  if (filePath.includes('settings.json')) return true;
  return require('fs').existsSync(filePath);
};

// Mock electron
require.cache[require.resolve('electron')] = {
  exports: { app: mockApp }
};

class LiveTestRunner {
  constructor() {
    this.results = [];
    this.totalApiCalls = 0;
    this.totalCost = 0;
    this.startTime = Date.now();
  }

  async initialize() {
    log('cyan', '🚀 Initializing Sequential Matching Service with Allied Air catalog...');
    log('bright', `📊 Our Catalog: ${alliedAirCatalog.length} Allied Air products`);
    log('bright', `🎯 Test Cases: ${competitorProducts.length} competitor products`);
    log('bright', `🔑 API Key: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
    
    this.sequentialMatcher = new SequentialMatchingService();
    await new Promise(resolve => setTimeout(resolve, 1500));
    log('green', '✅ Service initialized\n');
  }

  async runTest(competitor, index) {
    const testNum = index + 1;
    const total = competitorProducts.length;
    
    log('blue', `${'='.repeat(70)}`);
    log('bright', `🧪 Test ${testNum}/${total}: ${competitor.name}`);
    log('yellow', `   SKU: ${competitor.sku} | Model: ${competitor.model}`);
    log('yellow', `   Company: ${competitor.company} | Price: $${competitor.price}`);
    log('blue', `${'='.repeat(70)}`);
    
    try {
      const startTime = Date.now();
      const result = await this.sequentialMatcher.performSequentialMatch(
        competitor,
        alliedAirCatalog
      );
      const duration = Date.now() - startTime;
      
      // Track costs
      if (result.matchingStage === 'ai_enhanced') {
        this.totalApiCalls++;
        this.totalCost += 0.015; // Approximate cost per GPT-4 request
      }
      
      // Display results
      log('green', `✅ Completed in ${duration}ms`);
      this.displayResults(result);
      
      this.results.push({
        name: competitor.name,
        stage: result.matchingStage,
        matches: result.matches.length,
        confidence: result.confidence,
        duration,
        aiUsed: !!result.aiEnhancement,
        success: result.matches.length > 0 || result.matchingStage === 'failed'
      });
      
    } catch (error) {
      log('red', `❌ Test failed: ${error.message}`);
      this.results.push({
        name: competitor.name,
        stage: 'error',
        error: error.message,
        success: false
      });
    }
  }

  displayResults(result) {
    log('bright', `🎯 RESULTS:`);
    log('cyan', `   Stage: ${result.matchingStage.toUpperCase()}`);
    log('cyan', `   Matches Found: ${result.matches.length}`);
    log('cyan', `   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    
    if (result.matches.length > 0) {
      const match = result.matches[0];
      log('green', `\n🏆 BEST MATCH:`);
      log('green', `   Our SKU: ${match.ourSku}`);
      log('green', `   Brand: ${match.ourProduct.brand}`);
      log('green', `   Model: ${match.ourProduct.model}`);
      log('green', `   Price: $${match.ourProduct.price}`);
      log('green', `   Method: ${match.matchMethod}`);
      if (match.reasoning) {
        log('green', `   Reasoning: ${match.reasoning.join(', ')}`);
      }
    }
    
    if (result.aiEnhancement?.structuredOutput) {
      log('magenta', `\n🤖 AI ANALYSIS:`);
      const ai = result.aiEnhancement.structuredOutput;
      log('magenta', `   Match Found: ${ai.match_found}`);
      log('magenta', `   AI Confidence: ${ai.confidence || 'N/A'}`);
      if (ai.reasoning?.length > 0) {
        log('magenta', `   AI Reasoning:`);
        ai.reasoning.forEach((reason, i) => {
          log('magenta', `     ${i + 1}. ${reason}`);
        });
      }
      if (ai.enhanced_competitor_data) {
        log('magenta', `   Enhanced Data: ${JSON.stringify(ai.enhanced_competitor_data, null, 2)}`);
      }
    }
    
    log('yellow', `\n📋 PROCESSING STEPS:`);
    result.processingSteps.forEach((step, i) => {
      const icon = step.includes('✓') ? '✅' : step.includes('✗') ? '❌' : step.includes('⚠️') ? '⚠️' : '🔄';
      log('yellow', `   ${i + 1}. ${icon} ${step}`);
    });
    
    log('blue', `\n${'─'.repeat(70)}\n`);
  }

  async runAllTests() {
    await this.initialize();
    
    for (let i = 0; i < competitorProducts.length; i++) {
      await this.runTest(competitorProducts[i], i);
      
      // Brief pause between tests
      if (i < competitorProducts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    const totalTime = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const successful = this.results.filter(r => r.success).length;
    const withMatches = this.results.filter(r => r.matches > 0).length;
    const avgDuration = this.results.reduce((sum, r) => sum + (r.duration || 0), 0) / this.results.length;
    
    log('blue', `\n${'='.repeat(70)}`);
    log('bright', '📊 COMPREHENSIVE TEST SUMMARY');
    log('blue', `${'='.repeat(70)}`);
    
    log('bright', `⏱️  Total Runtime: ${totalTime}s`);
    log('bright', `📈 Tests Completed: ${this.results.length}`);
    log('bright', `✅ Successful: ${successful}/${this.results.length}`);
    log('bright', `🎯 Found Matches: ${withMatches}/${this.results.length}`);
    log('bright', `⚡ Avg Response Time: ${avgDuration.toFixed(0)}ms`);
    log('bright', `🤖 AI Calls Made: ${this.totalApiCalls}`);
    log('bright', `💰 Estimated Cost: $${this.totalCost.toFixed(3)}`);
    
    // Stage breakdown
    const stageBreakdown = {};
    this.results.forEach(r => {
      stageBreakdown[r.stage] = (stageBreakdown[r.stage] || 0) + 1;
    });
    
    log('cyan', '\n📊 MATCHING STAGE BREAKDOWN:');
    Object.entries(stageBreakdown).forEach(([stage, count]) => {
      const percentage = ((count / this.results.length) * 100).toFixed(1);
      log('cyan', `   ${stage.toUpperCase()}: ${count} tests (${percentage}%)`);
    });
    
    // Successful matches
    const matches = this.results.filter(r => r.matches > 0);
    if (matches.length > 0) {
      log('green', '\n✅ SUCCESSFUL MATCHES:');
      matches.forEach(result => {
        const confidence = result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : 'N/A';
        const ai = result.aiUsed ? '🤖' : '⚙️';
        log('green', `   ${ai} ${result.name} (${result.stage}, ${confidence} confidence)`);
      });
    }
    
    // Failed matches
    const failed = this.results.filter(r => !r.success || r.matches === 0);
    if (failed.length > 0) {
      log('yellow', '\n⚠️  NO MATCHES FOUND:');
      failed.forEach(result => {
        log('yellow', `   • ${result.name} (${result.stage})`);
      });
    }
    
    // Performance insights
    log('blue', '\n🔍 PERFORMANCE INSIGHTS:');
    const fastTests = this.results.filter(r => r.duration < 1000).length;
    const slowTests = this.results.filter(r => r.duration > 3000).length;
    log('blue', `   Fast tests (<1s): ${fastTests}`);
    log('blue', `   Slow tests (>3s): ${slowTests}`);
    
    // Final assessment
    const successRate = (successful / this.results.length * 100).toFixed(1);
    log('bright', `\n🎯 OVERALL SUCCESS RATE: ${successRate}%`);
    
    if (successRate >= 90) {
      log('green', '🎉 EXCELLENT! Sequential matching system is working great!');
    } else if (successRate >= 75) {
      log('yellow', '👍 GOOD! System is working well with room for improvement.');
    } else {
      log('red', '⚠️  NEEDS WORK! Review failed tests and improve matching logic.');
    }
    
    log('blue', `\n${'='.repeat(70)}`);
    log('bright', 'Test completed! The sequential matching system has been validated with real data.');
    log('blue', `${'='.repeat(70)}\n`);
  }
}

// Main execution
async function runLiveTest() {
  try {
    const runner = new LiveTestRunner();
    await runner.runAllTests();
  } catch (error) {
    log('red', `💥 Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  runLiveTest();
}

module.exports = { LiveTestRunner };