#!/usr/bin/env python3
"""
Setup script for CompPrice Bot - Cross-platform installation
"""

import os
import sys
import platform
import subprocess
import shutil
from pathlib import Path

def run_command(cmd, description="", check=True):
    """Run a command with proper error handling"""
    print(f"🔧 {description}")
    try:
        result = subprocess.run(cmd, shell=True, check=check, capture_output=True, text=True)
        if result.stdout:
            print(result.stdout)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stderr:
            print(f"Error details: {e.stderr}")
        return False

def check_python_version():
    """Check if Python version is compatible"""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python {version.major}.{version.minor} detected. Python 3.8+ required.")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detected")
    return True

def check_node_version():
    """Check if Node.js is available"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} detected")
            return True
    except FileNotFoundError:
        pass
    
    print("❌ Node.js not found. Please install Node.js 14+ from https://nodejs.org/")
    return False

def setup_virtual_environment():
    """Create and setup virtual environment"""
    venv_path = Path("venv")
    
    if venv_path.exists():
        print("✅ Virtual environment already exists")
        return True
    
    print("📦 Creating virtual environment...")
    if not run_command(f"{sys.executable} -m venv venv", "Creating virtual environment"):
        return False
    
    return True

def get_activation_command():
    """Get the appropriate activation command for the current platform"""
    if platform.system() == "Windows":
        return "venv\\Scripts\\activate"
    else:
        return "source venv/bin/activate"

def install_python_dependencies():
    """Install Python dependencies"""
    print("📥 Installing Python dependencies...")
    
    # Get the correct pip path
    if platform.system() == "Windows":
        pip_path = "venv\\Scripts\\pip"
    else:
        pip_path = "venv/bin/pip"
    
    # Upgrade pip first
    if not run_command(f"{pip_path} install --upgrade pip", "Upgrading pip"):
        return False
    
    # Install requirements
    if not run_command(f"{pip_path} install -r requirements.txt", "Installing requirements"):
        return False
    
    return True

def install_frontend_dependencies():
    """Install frontend dependencies"""
    print("📥 Installing frontend dependencies...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print("❌ Frontend directory not found")
        return False
    
    original_dir = os.getcwd()
    try:
        os.chdir("frontend")
        if not run_command("npm install", "Installing npm packages"):
            return False
        return True
    finally:
        os.chdir(original_dir)

def setup_environment_file():
    """Setup .env file if it doesn't exist"""
    env_file = Path(".env")
    env_example = Path(".env.example")
    
    if not env_file.exists() and env_example.exists():
        print("📝 Creating .env file from template...")
        shutil.copy(env_example, env_file)
        print("✅ .env file created. Please edit it with your OpenAI API key.")
        return True
    elif env_file.exists():
        print("✅ .env file already exists")
        return True
    else:
        print("❌ No .env.example file found")
        return False

def create_directories():
    """Create necessary directories"""
    directories = ["docs", "data", "chroma_db", "logs"]
    
    for dir_name in directories:
        dir_path = Path(dir_name)
        if not dir_path.exists():
            dir_path.mkdir(parents=True, exist_ok=True)
            print(f"📁 Created directory: {dir_name}")
        else:
            print(f"✅ Directory exists: {dir_name}")
    
    return True

def create_startup_scripts():
    """Create startup scripts for different platforms"""
    
    # Create Unix/Mac startup script
    unix_script = Path("start.sh")
    unix_content = """#!/bin/bash
echo "🚀 Starting CompPrice Bot..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Run python setup.py first."
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Start backend
echo "🔧 Starting backend..."
cd backend
python app.py &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 3

# Start frontend
echo "🎨 Starting frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ Services started!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5000"
echo ""
echo "Press Ctrl+C to stop all services..."

# Wait for processes
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait $BACKEND_PID $FRONTEND_PID
"""
    
    with open(unix_script, 'w') as f:
        f.write(unix_content)
    
    # Make executable on Unix/Mac
    if platform.system() != "Windows":
        os.chmod(unix_script, 0o755)
    
    # Create Windows startup script
    windows_script = Path("start.bat")
    windows_content = """@echo off
echo 🚀 Starting CompPrice Bot...

REM Check if virtual environment exists
if not exist "venv" (
    echo ❌ Virtual environment not found. Run python setup.py first.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\\Scripts\\activate.bat

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
echo 🔧 Backend: http://localhost:5000
echo.
echo Press any key to exit...
pause >nul
"""
    
    with open(windows_script, 'w') as f:
        f.write(windows_content)
    
    print("✅ Created startup scripts: start.sh (Unix/Mac) and start.bat (Windows)")
    return True

def test_installation():
    """Test if the installation was successful"""
    print("\n🧪 Testing installation...")
    
    # Get the correct python path
    if platform.system() == "Windows":
        python_path = "venv\\Scripts\\python"
    else:
        python_path = "venv/bin/python"
    
    # Test imports
    test_script = """
try:
    import flask
    import openai
    import chromadb
    import easyocr
    print("✅ All imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    exit(1)
"""
    
    with open("test_imports.py", "w") as f:
        f.write(test_script)
    
    success = run_command(f"{python_path} test_imports.py", "Testing imports")
    
    # Clean up
    os.remove("test_imports.py")
    
    return success

def main():
    """Main setup function"""
    print("🚀 CompPrice Bot Setup")
    print("=" * 50)
    print(f"Platform: {platform.system()} {platform.machine()}")
    print(f"Python: {sys.version}")
    print("=" * 50)
    
    steps = [
        ("Checking Python version", check_python_version),
        ("Checking Node.js", check_node_version),
        ("Setting up virtual environment", setup_virtual_environment),
        ("Installing Python dependencies", install_python_dependencies),
        ("Installing frontend dependencies", install_frontend_dependencies),
        ("Setting up environment file", setup_environment_file),
        ("Creating directories", create_directories),
        ("Creating startup scripts", create_startup_scripts),
        ("Testing installation", test_installation),
    ]
    
    failed_steps = []
    
    for step_name, step_func in steps:
        print(f"\n📋 {step_name}...")
        if not step_func():
            failed_steps.append(step_name)
    
    print("\n" + "=" * 50)
    if failed_steps:
        print("❌ Setup completed with errors:")
        for step in failed_steps:
            print(f"  - {step}")
        print("\nPlease fix the errors above and run setup again.")
        return False
    else:
        print("🎉 Setup completed successfully!")
        print("\nNext steps:")
        print("1. Edit .env file with your OpenAI API key")
        print("2. Add your product catalog to the docs/ folder")
        print("3. Run the startup script:")
        if platform.system() == "Windows":
            print("   - Windows: start.bat")
        else:
            print("   - Mac/Linux: ./start.sh")
        print("4. Open http://localhost:3000 in your browser")
        return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)