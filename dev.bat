@echo off

REM HVAC Crosswalk Development Script
REM Starts the development environment with hot reload

echo 🚀 Starting HVAC Crosswalk Development Environment...
echo    - React dev server with hot reload
echo    - Electron main process in watch mode
echo    - DevTools enabled
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies first...
    npm install
)

REM Start development mode
echo 🔧 Starting development servers...
npm run dev