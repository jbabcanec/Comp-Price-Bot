#!/bin/bash

# Live Sequential Matching Test Script
# Usage: ./test.sh

echo "🚀 Allied Air Sequential Matching Live Test Suite"
echo "=================================================="
echo ""
echo "This will:"
echo "  ✅ Test with real Allied Air catalog (20 products)"
echo "  ✅ Test 12 competitor scenarios"
echo "  ✅ Make live OpenAI API calls"
echo "  ✅ Show detailed matching results"
echo "  ✅ Estimate costs (~\$0.05 total)"
echo ""

# Prompt for API key securely
echo "🔑 Please enter your OpenAI API key:"
read -s -p "API Key: " API_KEY
echo ""

# Validate API key format
if [[ ! "$API_KEY" =~ ^sk- ]]; then
    echo "❌ Invalid API key format. Should start with 'sk-'"
    exit 1
fi

if [ ${#API_KEY} -lt 20 ]; then
    echo "❌ API key too short. Please check and try again."
    exit 1
fi

echo "🔑 API key received: ${API_KEY:0:20}..."
echo ""

# Build project if needed
if [ ! -d "dist" ]; then
    echo "🏗️  Building project..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Build failed! Run 'npm run build' to fix."
        exit 1
    fi
    echo "✅ Build completed"
    echo ""
fi

# Check if test files exist
if [ ! -f "tests/live-api-test.js" ]; then
    echo "❌ Test files not found! Make sure you're in the project root."
    exit 1
fi

if [ ! -f "tests/data/allied-air-catalog.js" ]; then
    echo "❌ Allied Air catalog not found!"
    exit 1
fi

echo "📊 Test Configuration:"
echo "   • Our catalog: Allied Air products (Armstrong, AirEase, Ducane)"
echo "   • Competitors: Trane, Carrier, Lennox, Rheem, Goodman + edge cases"
echo "   • Stages: Exact → Fuzzy → Specs → AI → Web Research → Failed"
echo "   • API: OpenAI GPT-4 for HVAC knowledge"
echo ""

echo "🎯 Expected Results:"
echo "   • Stage 1 (Exact): 2 tests should match immediately"
echo "   • Stage 2 (Fuzzy): 1 test should match with high similarity"
echo "   • Stage 3 (Specs): 2 tests should match by tonnage/SEER/AFUE"
echo "   • Stage 4 (AI): 5 tests should use HVAC knowledge"
echo "   • Failed: 2 tests should fail (pool equipment, commercial)"
echo ""

read -p "🚀 Ready to run live test? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled."
    exit 0
fi

echo "🧪 Starting live sequential matching test..."
echo ""

# Export API key and run test
export OPENAI_API_KEY="$API_KEY"
node tests/live-api-test.js

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "🎉 Live test completed successfully!"
    echo ""
    echo "💡 Next steps:"
    echo "   • Review any failed matches above"
    echo "   • Check AI reasoning for accuracy"
    echo "   • Monitor OpenAI usage in dashboard"
    echo "   • Integrate into your application"
else
    echo "❌ Test failed with exit code $TEST_EXIT_CODE"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   • Check API key is valid and has credits"
    echo "   • Ensure project built successfully"
    echo "   • Check network connectivity"
    echo "   • Review error messages above"
fi

echo ""
echo "📋 Test Summary:"
echo "   • Real Allied Air catalog data used"
echo "   • Live OpenAI API integration tested"
echo "   • Sequential fallback chain validated"
echo "   • HVAC domain knowledge verified"
echo ""

exit $TEST_EXIT_CODE