# Live Sequential Matching Test Suite

This directory contains tests that make **real API calls** to OpenAI to validate the sequential matching system.

## 🚀 Quick Start

```bash
# 1. Build the project
npm run build

# 2. Set your OpenAI API key
export OPENAI_API_KEY="your-api-key-here"

# 3. Run the comprehensive test suite
node tests/manual/live-sequential-test.js
```

## 🧪 What Gets Tested

### Test Scenarios (7 total):

1. **Stage 1: Exact SKU Match** - Should stop immediately with 95% confidence
2. **Stage 1: Exact Model Match** - Should stop immediately with 85% confidence  
3. **Stage 3: Specification Match** - Should match by tonnage/SEER specs
4. **Stage 4: AI Enhancement - Rheem AC** - Cross-brand recognition
5. **Stage 4: AI Enhancement - American Standard HP** - Trane equivalent recognition
6. **Stage 4: AI Enhancement - Goodman Furnace** - Furnace efficiency matching
7. **No Match: Pool Equipment** - Should fail (non-HVAC product)

### Validation Points:

✅ **Sequential Fallback Progression** - Each stage tried in order  
✅ **AI Structured JSON Response** - Proper JSON format with required fields  
✅ **HVAC Domain Knowledge** - AI recognizes cross-brand equivalents  
✅ **Error Handling** - Graceful failures and recovery  
✅ **Performance** - Response times under reasonable limits  
✅ **Cost Tracking** - Estimates API usage costs  

## 📊 Sample Output

```
🧪 Running 7 Live Sequential Matching Tests
🔑 Using API key: sk-proj-Ubvn5wrrgxb0...

============================================================
📝 Test 1/7: Stage 1: Exact SKU Match
   Should stop at exact matching with 95% confidence
============================================================
🔍 Starting sequential matching...
✅ Completed in 45ms
📊 RESULTS:
   Stage: exact
   Matches: 1
   Confidence: 95.0%
   Best Match: LEN-AC-3T-16S
   Method: exact_sku

📋 PROCESSING STEPS:
   1. ✅ Stage 1: Attempting exact SKU/Model match
   2. ✅ Exact match found with 95.0% confidence

✅ VALIDATION: Reached expected stage (exact)

============================================================
📝 Test 4/7: Stage 4: AI Enhancement - Rheem AC
   Should require AI to recognize cross-brand equivalent
============================================================
🔍 Starting sequential matching...
✅ Completed in 2847ms
📊 RESULTS:
   Stage: ai_enhanced
   Matches: 1
   Confidence: 78.0%
   Best Match: YOR-AC-3T-14S
   Method: ai_enhanced

🤖 AI ENHANCEMENT RESULTS:
   Match Found: true
   AI Confidence: 0.78
   AI Reasoning:
     1. Both are 3-ton residential air conditioning units
     2. Similar SEER ratings (14 vs 16) within acceptable range
     3. Compatible refrigerant types (R-410A)
     4. Equivalent capacity and application

📋 PROCESSING STEPS:
   1. 🔄 Stage 1: Attempting exact SKU/Model match
   2. ❌ No high-confidence exact match found
   3. 🔄 Stage 2: Attempting fuzzy matching
   4. ❌ No high-confidence fuzzy match found
   5. 🔄 Stage 3: Attempting specification-based matching
   6. ❌ No high-confidence specification match found
   7. 🔄 Stage 4: Attempting AI-enhanced matching using HVAC knowledge
   8. ✅ AI enhancement found match with 78.0% confidence

✅ VALIDATION: Reached expected stage (ai_enhanced)
```

## 💰 Cost Estimation

- **GPT-4 Turbo**: ~$0.01 per request
- **Expected cost**: ~$0.03-0.07 for full test suite
- **Real-time tracking** shows actual API usage

## 🔒 Security Notes

- ✅ **Environment variables only** - No hardcoded keys
- ✅ **Not in version control** - Manual testing only
- ✅ **Local execution** - Your machine, your key
- ✅ **Cost awareness** - Shows estimated charges

## 🎯 Success Criteria

The test suite **passes** if:
- [x] Exact matches stop at Stage 1 with high confidence
- [x] AI cases progress through all stages to Stage 4
- [x] AI returns valid JSON with required fields
- [x] HVAC knowledge produces reasonable matches
- [x] Non-HVAC products fail appropriately
- [x] All processing steps are logged correctly
- [x] Performance is under 5 seconds per test

## 🐛 Troubleshooting

**"OPENAI_API_KEY environment variable not set"**
```bash
export OPENAI_API_KEY="your-key-here"
```

**"Cannot find module 'dist/src/main/services/sequential-matching.service'"**
```bash
npm run build
```

**"API key invalid"**
- Check your key is correct and active
- Verify you have credits remaining

**"Rate limit exceeded"**
- Wait a minute and try again
- The test has built-in delays between requests