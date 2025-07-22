@echo off

REM HVAC Crosswalk Production Build Script
REM Builds and runs the production version

echo 🏗️  Building HVAC Crosswalk for Production...
echo    - TypeScript compilation
echo    - Webpack production build
echo    - Launching Electron app
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies first...
    npm install
)

REM Build and start production
echo ⚡ Building and launching...
npm run start