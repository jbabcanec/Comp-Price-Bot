#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 HVAC Price Analyzer Installation Script');
console.log('==========================================\n');

// Check if Node.js and npm are installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js: ${nodeVersion}`);
  console.log(`✅ npm: ${npmVersion}\n`);
} catch (error) {
  console.error('❌ Node.js and npm are required but not found.');
  console.error('Please install Node.js from https://nodejs.org/');
  process.exit(1);
}

// Check if package.json exists
if (!fs.existsSync('package.json')) {
  console.error('❌ package.json not found. Make sure you\'re in the correct directory.');
  process.exit(1);
}

try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully!\n');

  console.log('🔧 Rebuilding native modules for Electron...');
  execSync('npm run rebuild', { stdio: 'inherit' });
  console.log('✅ Native modules rebuilt successfully!\n');

  console.log('🏗️  Building application...');
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Application built successfully!\n');

  console.log('🎉 Installation completed successfully!');
  console.log('\n📋 Available commands:');
  console.log('  npm start      - Run the application');
  console.log('  npm run dev    - Run in development mode');
  console.log('  npm test       - Run tests');
  console.log('  npm run lint   - Check code quality');
  console.log('\n🚀 To start the application, run: npm start');

} catch (error) {
  console.error('\n❌ Installation failed:', error.message);
  console.error('\n🔧 Troubleshooting:');
  console.error('  1. Make sure you have Node.js 16+ installed');
  console.error('  2. Try deleting node_modules and running again');
  console.error('  3. Check your internet connection');
  console.error('  4. Run with --verbose flag: npm install --verbose');
  process.exit(1);
}