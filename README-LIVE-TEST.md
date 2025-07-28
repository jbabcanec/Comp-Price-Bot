# 🚀 Live Sequential Matching Test

**Complete end-to-end validation with real Allied Air catalog and OpenAI API**

## Quick Start

```bash
# Just run this one command:
./test.sh
```

**That's it!** The script will:
1. ✅ Prompt you to paste your OpenAI API key securely 
2. ✅ Build the project if needed
3. ✅ Run 12 comprehensive test scenarios
4. ✅ Show detailed results and AI reasoning
5. ✅ Provide complete performance summary

## 🎯 What Gets Tested

### Real Allied Air Catalog (20 Products):
- Armstrong Air heat pumps (15-22 SEER)
- AirEase models (same products, different branding)
- Ducane & Armstrong 97% AFUE furnaces
- All-climate cold weather heat pumps
- Package units and air handlers

### 12 Test Scenarios:
1. **Exact SKU** → Should stop at Stage 1 (95% confidence)
2. **Exact Model** → Should stop at Stage 1 (85% confidence)
3. **Fuzzy Match** → Should succeed at Stage 2
4. **Spec Match (HP)** → Should match by tonnage/SEER at Stage 3
5. **Spec Match (Furnace)** → Should match by AFUE at Stage 3
6. **Trane Heat Pump** → Should use AI at Stage 4 for cross-brand
7. **Carrier Heat Pump** → Should use AI for brand equivalent
8. **Lennox Furnace** → Should use AI for premium brand matching
9. **Rheem Classic** → Should use AI for HVAC knowledge
10. **Goodman Furnace** → Should use AI for value brand recognition
11. **Pool Equipment** → Should fail (not HVAC)
12. **Commercial RTU** → Should fail (wrong application)

## 📊 Expected Results

```
🎯 OVERALL SUCCESS RATE: 90%+

📊 MATCHING STAGE BREAKDOWN:
   EXACT: 2 tests (16.7%)
   FUZZY: 1 test (8.3%)
   SPECIFICATION: 2 tests (16.7%)
   AI_ENHANCED: 5 tests (41.7%)
   FAILED: 2 tests (16.7%)

🤖 AI Calls Made: 5-7
💰 Estimated Cost: $0.03-0.07
```

## 🔒 Security Features

- ✅ **Hidden input** - API key not shown on screen
- ✅ **Input validation** - Checks key format
- ✅ **No storage** - Key only in memory during test
- ✅ **Local execution** - Runs on your machine only

## 💡 Sample AI Analysis

```
🤖 AI ANALYSIS:
   Match Found: true
   AI Confidence: 0.782
   AI Reasoning:
     1. Both are 3-ton residential heat pumps
     2. Similar SEER ratings (16 vs 17) within acceptable range  
     3. Compatible refrigerant types (R-410A)
     4. Equivalent residential application and capacity
   Enhanced Data: {
     "identified_specifications": {
       "tonnage": "3",
       "seer": "16", 
       "product_type": "heat_pump"
     },
     "product_category": "cooling",
     "key_features": ["scroll_compressor", "residential_application"]
   }
```

## ⚡ Quick Validation

Run this to verify everything is ready:

```bash
# Check if all files exist
ls tests/data/allied-air-catalog.js tests/live-api-test.js test.sh

# Make sure it's executable  
chmod +x test.sh

# Run the test
./test.sh
```

## 🎉 That's It!

Just run `./test.sh` and paste your API key when prompted. You'll get a complete validation of your sequential matching system with:

- **Real Allied Air product data**
- **Live OpenAI API integration** 
- **Comprehensive test scenarios**
- **Detailed performance metrics**
- **Full audit trail of processing steps**

The system will prove your AI-enhanced sequential matching works perfectly with real HVAC data! 🚀