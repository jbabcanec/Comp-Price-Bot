/**
 * Test Configuration and Environment Setup
 * 
 * This file provides a self-contained testing environment for the HVAC Crosswalk system.
 * It handles all necessary mocking and setup for running tests outside the Electron context.
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env file
require('dotenv').config();

// Mock Electron app for testing
const mockApp = {
  getPath: (type) => {
    switch (type) {
      case 'userData':
        return '/tmp/hvac-test-data';
      case 'logs':
        return '/tmp/hvac-test-logs';
      default:
        return '/tmp';
    }
  },
  getName: () => 'HVAC Price Analyzer Test',
  getVersion: () => '1.0.0-test'
};

// Mock fs methods to intercept settings.json reads
const originalReadFileSync = fs.readFileSync;
const originalExistsSync = fs.existsSync;

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
  return originalExistsSync.call(this, filePath);
};

// Mock Electron module
require.cache[require.resolve('electron')] = {
  exports: { app: mockApp }
};

// Setup test environment
process.env.NODE_ENV = 'test';

// Suppress logger errors in test environment
const originalConsoleError = console.error;
console.error = function(...args) {
  // Skip logger initialization errors in tests
  if (args[0] && args[0].toString().includes('Failed to initialize logger')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Export test utilities
module.exports = {
  mockApp,
  
  // Check if API key is available
  checkApiKey: () => {
    if (!process.env.OPENAI_API_KEY) {
      console.error('\n❌ Missing OPENAI_API_KEY');
      console.error('\n💡 Please add your API key to the .env file:');
      console.error('   1. Edit .env file in project root');
      console.error('   2. Replace "sk-proj-paste-your-actual-key-here" with your actual API key\n');
      return false;
    }
    return true;
  },
  
  // Get the sequential matching service with proper path
  getSequentialMatchingService: () => {
    const servicePath = path.join(__dirname, '../dist/main/main/services/sequential-matching.service');
    return require(servicePath).SequentialMatchingService;
  },
  
  // Color utilities for pretty output
  colors: {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
  },
  
  // Logging utility
  log: function(color, message) {
    console.log(`${this.colors[color]}${message}${this.colors.reset}`);
  }
};