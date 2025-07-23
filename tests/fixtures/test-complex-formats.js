/**
 * Test script to verify complex file format handling
 * Tests: ZIP archives, MSG files, image OCR, and text extraction
 */

const fs = require('fs').promises;
const path = require('path');

async function createTestFiles() {
  const testDir = path.join(__dirname, 'test-files');
  
  // Create test directory
  try {
    await fs.mkdir(testDir, { recursive: true });
  } catch (e) {
    // Directory already exists
  }

  // Create test CSV content for ZIP testing
  const csvContent = `SKU,Brand,Model,Type,Price,SEER,Tonnage
LEN-XR16-024,Lennox,XR16-024,Air Conditioner,2850.00,16,2.0
TRN-XL18-036,Trane,XL18i-036,Heat Pump,3450.00,18,3.0
CAR-24ABC-048,Carrier,24ABC6-048,Condenser,4200.00,15,4.0
GDM-GSX16-030,Goodman,GSX160301,Air Conditioner,2200.00,16,2.5`;

  const csvPath = path.join(testDir, 'hvac-products.csv');
  await fs.writeFile(csvPath, csvContent);

  // Create test text file with HVAC data
  const txtContent = `HVAC EQUIPMENT PRICE LIST - WINTER 2025

Model: XR16-024-230
Brand: Lennox
Type: Air Conditioner
Tonnage: 2.0 Tons
SEER: 16
Price: $2,850.00
Description: High efficiency air conditioner with variable speed technology

Model: XL18i-036-230
Brand: Trane
Type: Heat Pump  
Tonnage: 3.0 Tons
SEER: 18
Price: $3,450.00
Description: Variable speed heat pump with ComfortR technology

Model: 24ABC6-048-230
Brand: Carrier
Type: Condenser
Tonnage: 4.0 Tons
SEER: 15
Price: $4,200.00
Description: Standard efficiency outdoor condensing unit`;

  const txtPath = path.join(testDir, 'price-list.txt');
  await fs.writeFile(txtPath, txtContent);

  // Create mock MSG content (simplified email format)
  const msgContent = `From: sales@hvacworld.com
To: purchasing@company.com
Subject: Q1 2025 Equipment Pricing
Date: Mon, 15 Jan 2025 09:00:00 -0500

Dear Purchasing Team,

Please find our updated pricing for Q1 2025:

LENNOX XR16-024: $2,850.00 (16 SEER, 2 Ton)
TRANE XL18i-036: $3,450.00 (18 SEER, 3 Ton)  
CARRIER 24ABC6-048: $4,200.00 (15 SEER, 4 Ton)

All prices include standard warranty.

Best regards,
HVAC World Sales Team`;

  const msgPath = path.join(testDir, 'pricing-email.msg');
  await fs.writeFile(msgPath, msgContent);

  console.log('Test files created:');
  console.log(`- CSV: ${csvPath}`);
  console.log(`- TXT: ${txtPath}`);
  console.log(`- MSG: ${msgPath}`);

  return {
    csvPath,
    txtPath,
    msgPath,
    testDir
  };
}

async function testFileProcessing() {
  console.log('🧪 Testing Complex File Format Processing\n');

  try {
    const testFiles = await createTestFiles();

    // Test 1: CSV Processing (baseline)
    console.log('📊 Testing CSV processing...');
    console.log(`File: ${path.basename(testFiles.csvPath)}`);
    console.log('Expected: Should extract 4 products with SKU, brand, price data\n');

    // Test 2: Text File Processing
    console.log('📄 Testing TXT processing...');
    console.log(`File: ${path.basename(testFiles.txtPath)}`);
    console.log('Expected: Should extract 3 products with detailed specs\n');

    // Test 3: MSG File Processing
    console.log('📧 Testing MSG/Email processing...');
    console.log(`File: ${path.basename(testFiles.msgPath)}`);
    console.log('Expected: Should extract 3 products from email body\n');

    // Test 4: ZIP Archive Processing (create a ZIP with test files)
    console.log('🗜️ Testing ZIP processing...');
    console.log('Note: ZIP processing requires creating an actual archive');
    console.log('Manual test: Create a ZIP with the generated CSV and TXT files\n');

    console.log('✅ Test files ready for processing');
    console.log(`📁 Test directory: ${testFiles.testDir}`);
    console.log('\nNext steps:');
    console.log('1. Use the Products page to select the test-files directory');
    console.log('2. Process the files and verify extraction works');
    console.log('3. Create a ZIP archive manually and test ZIP processing');
    console.log('4. Test image OCR with a screenshot of HVAC pricing');

  } catch (error) {
    console.error('❌ Error creating test files:', error);
  }
}

// Run the test
testFileProcessing();