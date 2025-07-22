#!/bin/bash

# HVAC Crosswalk Production Build Script
# Builds and runs the production version

echo "🏗️  Building HVAC Crosswalk for Production..."
echo "   - TypeScript compilation"
echo "   - Webpack production build"
echo "   - Launching Electron app"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
fi

# Build and start production
echo "⚡ Building and launching..."
npm run start