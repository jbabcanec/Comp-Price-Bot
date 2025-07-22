#!/bin/bash

# HVAC Crosswalk Development Script
# Starts the development environment with hot reload

echo "🚀 Starting HVAC Crosswalk Development Environment..."
echo "   - React dev server with hot reload"
echo "   - Electron main process in watch mode"
echo "   - DevTools enabled"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

# Start development mode
echo "🔧 Starting development servers..."
npm run dev