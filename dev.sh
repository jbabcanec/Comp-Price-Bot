#!/bin/bash

# HVAC Crosswalk Development Script
echo "🚀 Starting HVAC Crosswalk Development Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development server
echo "🔥 Starting in development mode..."
echo "🎯 AI-First Architecture Ready!"
echo "📝 Features:"
echo "   • OpenAI-powered extraction"
echo "   • Universal file support"
echo "   • Systematic crosswalk matching"
echo "   • Clean JSON workflow"
echo ""

npm run dev