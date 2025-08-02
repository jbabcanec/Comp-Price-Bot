@echo off
echo 🚀 HVAC Price Analyzer Installation Script (Windows)
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is required but not found.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is required but not found.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js and npm found
echo.

REM Check if package.json exists
if not exist package.json (
    echo ❌ package.json not found. Make sure you're in the correct directory.
    pause
    exit /b 1
)

echo 📦 Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully!
echo.

echo 🔧 Rebuilding native modules for Electron...
npm run rebuild
if %errorlevel% neq 0 (
    echo ❌ Failed to rebuild native modules
    pause
    exit /b 1
)
echo ✅ Native modules rebuilt successfully!
echo.

echo 🏗️ Building application...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build application
    pause
    exit /b 1
)
echo ✅ Application built successfully!
echo.

echo 🎉 Installation completed successfully!
echo.
echo 📋 Available commands:
echo   npm start      - Run the application
echo   npm run dev    - Run in development mode
echo   npm test       - Run tests
echo   npm run lint   - Check code quality
echo.
echo 🚀 To start the application, run: npm start
echo.
pause