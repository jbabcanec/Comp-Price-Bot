#!/usr/bin/env python3
"""
System Test Script - Verifies all components are working correctly
"""
import sys
import subprocess
import time
import requests
import json
from pathlib import Path

class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(message, status):
    """Print colored status message"""
    if status == "success":
        print(f"{Colors.GREEN}✅ {message}{Colors.ENDC}")
    elif status == "warning":
        print(f"{Colors.YELLOW}⚠️  {message}{Colors.ENDC}")
    elif status == "error":
        print(f"{Colors.RED}❌ {message}{Colors.ENDC}")
    elif status == "info":
        print(f"{Colors.BLUE}ℹ️  {message}{Colors.ENDC}")
    else:
        print(f"   {message}")

def check_python_version():
    """Check Python version"""
    print(f"\n{Colors.BOLD}Checking Python version...{Colors.ENDC}")
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print_status(f"Python {version.major}.{version.minor}.{version.micro} ✓", "success")
        return True
    else:
        print_status(f"Python 3.8+ required, found {version.major}.{version.minor}", "error")
        return False

def check_dependencies():
    """Check if all Python dependencies are installed"""
    print(f"\n{Colors.BOLD}Checking Python dependencies...{Colors.ENDC}")
    required_packages = [
        'flask', 'flask_cors', 'flask_sqlalchemy', 'openai', 
        'chromadb', 'easyocr', 'beautifulsoup4', 'requests',
        'python-docx', 'pypdf', 'pillow', 'mail-parser'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"   {package} ✓")
        except ImportError:
            missing.append(package)
            print_status(f"{package} ✗", "error")
    
    if missing:
        print_status(f"\nMissing packages: {', '.join(missing)}", "error")
        print_status("Run: pip install -r requirements.txt", "info")
        return False
    else:
        print_status("All Python dependencies installed", "success")
        return True

def check_node_modules():
    """Check if frontend dependencies are installed"""
    print(f"\n{Colors.BOLD}Checking frontend dependencies...{Colors.ENDC}")
    node_modules = Path("frontend/node_modules")
    if node_modules.exists() and node_modules.is_dir():
        print_status("node_modules exists", "success")
        return True
    else:
        print_status("node_modules not found", "error")
        print_status("Run: cd frontend && npm install", "info")
        return False

def check_env_file():
    """Check if .env file exists and has API key"""
    print(f"\n{Colors.BOLD}Checking environment configuration...{Colors.ENDC}")
    env_file = Path(".env")
    
    if not env_file.exists():
        print_status(".env file not found", "error")
        print_status("Run: cp .env.example .env", "info")
        return False
    
    with open(env_file) as f:
        content = f.read()
        if "your_openai_api_key_here" in content or "OPENAI_API_KEY=" not in content:
            print_status(".env file exists but API key not configured", "warning")
            print_status("Edit .env and add your OpenAI API key", "info")
            return "partial"
        else:
            print_status(".env file configured", "success")
            return True

def check_backend_health():
    """Check if backend is running and healthy"""
    print(f"\n{Colors.BOLD}Checking backend status...{Colors.ENDC}")
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=5)
        data = response.json()
        
        if data.get("status") == "healthy":
            print_status("Backend is healthy", "success")
            return True
        elif data.get("status") == "degraded":
            print_status("Backend is running but degraded", "warning")
            print_status(data.get("message", "Unknown issue"), "info")
            return "partial"
        else:
            print_status("Backend returned unexpected status", "error")
            return False
    except requests.exceptions.ConnectionError:
        print_status("Backend not running", "error")
        print_status("Run: ./start.sh or make start", "info")
        return False
    except Exception as e:
        print_status(f"Backend check failed: {str(e)}", "error")
        return False

def check_frontend():
    """Check if frontend is accessible"""
    print(f"\n{Colors.BOLD}Checking frontend status...{Colors.ENDC}")
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        if response.status_code == 200:
            print_status("Frontend is accessible", "success")
            return True
        else:
            print_status(f"Frontend returned status {response.status_code}", "error")
            return False
    except requests.exceptions.ConnectionError:
        print_status("Frontend not running", "error")
        print_status("Run: ./start.sh or make start", "info")
        return False
    except Exception as e:
        print_status(f"Frontend check failed: {str(e)}", "error")
        return False

def check_imports():
    """Check if backend imports work correctly"""
    print(f"\n{Colors.BOLD}Checking backend imports...{Colors.ENDC}")
    
    # Test in backend directory
    import os
    original_dir = os.getcwd()
    try:
        os.chdir('backend')
        sys.path.insert(0, '.')
        
        # Try imports
        try:
            from services import HVACCompetitiveIntelligenceSystem, FileProcessor
            print("   services imports ✓")
        except ImportError as e:
            print_status(f"services import failed: {e}", "error")
            return False
            
        try:
            from models import db, CompetitorMatch
            print("   models imports ✓")
        except ImportError as e:
            print_status(f"models import failed: {e}", "error")
            return False
            
        print_status("All imports successful", "success")
        return True
    finally:
        os.chdir(original_dir)
        sys.path.pop(0)

def run_system_test():
    """Run complete system test"""
    print(f"{Colors.BOLD}{'='*50}{Colors.ENDC}")
    print(f"{Colors.BOLD}CompPrice Bot System Test{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*50}{Colors.ENDC}")
    
    results = {
        "Python Version": check_python_version(),
        "Python Dependencies": check_dependencies(),
        "Frontend Dependencies": check_node_modules(),
        "Environment Config": check_env_file(),
        "Import Test": check_imports(),
        "Backend Health": check_backend_health(),
        "Frontend Access": check_frontend(),
    }
    
    # Summary
    print(f"\n{Colors.BOLD}{'='*50}{Colors.ENDC}")
    print(f"{Colors.BOLD}Test Summary:{Colors.ENDC}")
    print(f"{Colors.BOLD}{'='*50}{Colors.ENDC}")
    
    all_pass = True
    for test, result in results.items():
        if result == True:
            print_status(f"{test}: PASS", "success")
        elif result == "partial":
            print_status(f"{test}: PARTIAL", "warning")
            all_pass = False
        else:
            print_status(f"{test}: FAIL", "error")
            all_pass = False
    
    print(f"\n{Colors.BOLD}{'='*50}{Colors.ENDC}")
    if all_pass:
        print_status("All tests passed! System is ready.", "success")
    else:
        print_status("Some tests failed. Please fix the issues above.", "warning")
        
        # Provide quick fixes
        print(f"\n{Colors.BOLD}Quick fixes:{Colors.ENDC}")
        if not results["Python Dependencies"]:
            print("1. pip install -r requirements.txt")
        if not results["Frontend Dependencies"]:
            print("2. cd frontend && npm install")
        if results["Environment Config"] in [False, "partial"]:
            print("3. Edit .env and add your OpenAI API key")
        if not results["Backend Health"] or not results["Frontend Access"]:
            print("4. ./start.sh")

if __name__ == "__main__":
    run_system_test()