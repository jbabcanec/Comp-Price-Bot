# 🚀 Live Sequential Matching Test Suite

**Complete end-to-end test with real Allied Air catalog and OpenAI API integration**

## Quick Start

```bash
# Just run this with your API key:
./test.sh sk-proj-your-api-key-here
```

## 📊 What Gets Tested

### Our Catalog (20 Allied Air Products):
- **Heat Pumps**: Armstrong Air 4SHP series (15-22 SEER)
- **Air Conditioners**: 13-16 SEER single & variable speed
- **Furnaces**: 97% AFUE Armstrong Air & Ducane models  
- **All-Climate**: Cold climate heat pumps (21 SEER)
- **Package Units**: Gas/electric combinations
- **Air Handlers**: Multi-position ECM motor units

### Test Scenarios (12 Competitor Products):

| Test | Competitor | Expected Stage | Purpose |
|------|------------|----------------|---------|
| 1 | **Exact SKU Match** | Stage 1 (Exact) | Test immediate exact matching |
| 2 | **Exact Model Match** | Stage 1 (Exact) | Test model number recognition |
| 3 | **Similar Armstrong** | Stage 2 (Fuzzy) | Test fuzzy string matching |
| 4 | **Generic 3T 17 SEER** | Stage 3 (Specs) | Test specification matching |
| 5 | **97% AFUE Furnace** | Stage 3 (Specs) | Test AFUE specification matching |
| 6 | **Trane Heat Pump** | Stage 4 (AI) | Test cross-brand recognition |
| 7 | **Carrier Heat Pump** | Stage 4 (AI) | Test brand equivalent matching |
| 8 | **Lennox Furnace** | Stage 4 (AI) | Test premium brand matching |
| 9 | **Rheem Classic** | Stage 4 (AI) | Test HVAC knowledge application |
| 10 | **Goodman Furnace** | Stage 4 (AI) | Test value brand recognition |
| 11 | **Pool Heat Pump** | Failed | Test non-HVAC rejection |
| 12 | **Commercial RTU** | Failed | Test commercial equipment rejection |

## 🎯 Expected Results

- **Exact Matches (2)**: Should stop immediately with 85-95% confidence
- **Fuzzy Matches (1)**: Should match with 60-80% confidence  
- **Spec Matches (2)**: Should match by tonnage/SEER/AFUE
- **AI Matches (5)**: Should use HVAC knowledge for cross-brand equivalents
- **Failed (2)**: Pool/commercial equipment should be rejected

## 🔍 Sample Output

```
🧪 Test 6/12: Trane Heat Pump (Cross-Brand)
==================================================
🔍 Starting sequential matching...
✅ Completed in 2,847ms

🎯 RESULTS:
   Stage: AI_ENHANCED
   Matches Found: 1
   Confidence: 78.2%

🏆 BEST MATCH:
   Our SKU: ARM-4SHP17LE036-AA
   Brand: Armstrong Air
   Model: 4SHP17LE036P
   Price: $3,450
   Method: ai_enhanced

🤖 AI ANALYSIS:
   Match Found: true
   AI Confidence: 0.782
   AI Reasoning:
     1. Both are 3-ton residential heat pumps
     2. Similar SEER ratings (16 vs 17) within acceptable range
     3. Compatible refrigerant types (R-410A)
     4. Equivalent residential application and capacity

📋 PROCESSING STEPS:
   1. 🔄 Stage 1: Attempting exact SKU/Model match
   2. ❌ No high-confidence exact match found
   3. 🔄 Stage 2: Attempting fuzzy matching
   4. ❌ No high-confidence fuzzy match found
   5. 🔄 Stage 3: Attempting specification-based matching
   6. ❌ No high-confidence specification match found
   7. 🔄 Stage 4: Attempting AI-enhanced matching using HVAC knowledge
   8. ✅ AI enhancement found match with 78.2% confidence
```

## 💰 Cost Information

- **API Calls**: ~5-7 calls to OpenAI (only for AI stage tests)
- **Model**: GPT-4 Turbo Preview
- **Estimated Cost**: $0.03 - $0.07 total
- **Real-time tracking** shows actual usage

## 🔒 Security Features

- ✅ **No hardcoded keys** - passed as parameter only
- ✅ **Environment variable** - key not stored in files
- ✅ **Local execution** - runs on your machine
- ✅ **No logging** - API key not written to logs

## 🎓 What This Validates

### ✅ Sequential Fallback Chain
- Progresses through stages 1→2→3→4→5 as designed
- Stops at first successful stage
- Handles failures gracefully

### ✅ AI Integration
- Makes real OpenAI API calls
- Returns structured JSON responses
- Applies HVAC domain knowledge
- Recognizes cross-brand equivalents

### ✅ Real-World Performance
- Tests with actual Allied Air catalog
- Realistic competitor scenarios
- Performance timing validation
- Cost estimation accuracy

### ✅ Error Handling
- Invalid API keys
- Network failures  
- Malformed responses
- Edge case products

## 🐛 Troubleshooting

**"Build failed"**
```bash
npm install
npm run build
```

**"API key invalid"**
- Check key format: `sk-proj-...`
- Verify credits remaining
- Test key at platform.openai.com

**"No matches found for everything"**
- Check specification matching logic
- Verify product data format
- Review confidence thresholds

**"AI stage never reached"**
- Earlier stages may be matching too broadly
- Adjust confidence thresholds
- Review test data design

## 📈 Success Criteria

The test **passes** if:
- [x] 90%+ tests complete without errors
- [x] Exact matches stop at Stage 1 with high confidence
- [x] AI tests reach Stage 4 and make API calls
- [x] Cross-brand matches show reasonable confidence
- [x] Non-HVAC products are rejected appropriately
- [x] All processing steps are logged correctly
- [x] Performance is under 5 seconds per test
- [x] API costs are reasonable (~$0.05 total)

---

## 🎉 Ready to Test!

```bash
# Build the project
npm run build

# Run the complete test suite
./test.sh your-openai-api-key-here
```

This will give you **definitive proof** that your sequential matching system works correctly with real data and live AI integration! 🚀