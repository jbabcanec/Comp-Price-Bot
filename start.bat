@echo off
echo 🚀 Starting CompPrice Bot...

REM Check if virtual environment exists
if not exist "venv" (
    echo ❌ Virtual environment not found. Run python setup.py first.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start backend
echo 🔧 Starting backend...
cd backend
start "Backend" python app.py
cd ..

REM Wait for backend
timeout /t 3 /nobreak >nul

REM Start frontend
echo 🎨 Starting frontend...
cd frontend
start "Frontend" npm start
cd ..

echo ✅ Services started!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:5001
echo.
echo Press any key to exit...
pause >nul
