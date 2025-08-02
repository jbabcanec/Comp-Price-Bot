#!/bin/bash

echo "🚀 HVAC Price Analyzer Installation Script"
echo "=========================================="
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not found."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is required but not found."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
echo "✅ Node.js: $NODE_VERSION"
echo "✅ npm: $NPM_VERSION"
echo

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Make sure you're in the correct directory."
    exit 1
fi

echo "📦 Installing dependencies..."
if npm install; then
    echo "✅ Dependencies installed successfully!"
    echo
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "🔧 Rebuilding native modules for Electron..."
if npm run rebuild; then
    echo "✅ Native modules rebuilt successfully!"
    echo
else
    echo "❌ Failed to rebuild native modules"
    exit 1
fi

echo "🏗️ Building application..."
if npm run build; then
    echo "✅ Application built successfully!"
    echo
else
    echo "❌ Failed to build application"
    exit 1
fi

echo "🎉 Installation completed successfully!"
echo
echo "📋 Available commands:"
echo "  npm start      - Run the application"
echo "  npm run dev    - Run in development mode"
echo "  npm test       - Run tests"
echo "  npm run lint   - Check code quality"
echo
echo "🚀 To start the application, run: npm start"