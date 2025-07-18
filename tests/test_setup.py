#!/usr/bin/env python3
"""
Test script to verify the setup is working correctly
"""

import os
import sys
from dotenv import load_dotenv

def test_imports():
    """Test that all required packages can be imported"""
    print("🔍 Testing imports...")
    
    try:
        import flask
        print("✅ Flask imported successfully")
    except ImportError as e:
        print(f"❌ Flask import failed: {e}")
        return False
    
    try:
        import openai
        print("✅ OpenAI imported successfully")
    except ImportError as e:
        print(f"❌ OpenAI import failed: {e}")
        return False
    
    try:
        from agents import Agent, Runner
        print("✅ OpenAI Agents SDK imported successfully")
    except ImportError as e:
        print(f"❌ OpenAI Agents SDK import failed: {e}")
        return False
    
    try:
        import easyocr
        print("✅ EasyOCR imported successfully")
    except ImportError as e:
        print(f"❌ EasyOCR import failed: {e}")
        return False
    
    try:
        import chromadb
        print("✅ ChromaDB imported successfully")
    except ImportError as e:
        print(f"❌ ChromaDB import failed: {e}")
        return False
    
    return True

def test_openai_connection():
    """Test OpenAI API connection"""
    print("\n🔍 Testing OpenAI API connection...")
    
    load_dotenv()
    api_key = os.getenv('OPENAI_API_KEY')
    
    if not api_key or api_key == 'your_openai_api_key_here':
        print("❌ OpenAI API key not configured in .env file")
        return False
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        
        # Test API connection
        response = client.models.list()
        print("✅ OpenAI API connection successful!")
        print(f"✅ Available models: {len(list(response.data))}")
        return True
    except Exception as e:
        print(f"❌ OpenAI API connection failed: {e}")
        return False

def test_database():
    """Test database initialization"""
    print("\n🔍 Testing database...")
    
    try:
        from backend.database import db
        from backend.app import app
        
        with app.app_context():
            db.create_all()
            print("✅ Database initialized successfully!")
            return True
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return False

def test_file_processor():
    """Test file processor"""
    print("\n🔍 Testing file processor...")
    
    try:
        from backend.file_processor import FileProcessor
        processor = FileProcessor()
        print("✅ File processor initialized successfully!")
        return True
    except Exception as e:
        print(f"❌ File processor initialization failed: {e}")
        return False

def test_agent_system():
    """Test multi-agent system initialization"""
    print("\n🔍 Testing multi-agent system...")
    
    try:
        from backend.agent_system import HVACCompetitiveIntelligenceSystem
        agent_system = HVACCompetitiveIntelligenceSystem()
        print("✅ Multi-agent system initialized successfully!")
        print("✅ Agents: Data Extraction, Matching, Web Research, Image Analysis, Orchestrator")
        return True
    except Exception as e:
        print(f"❌ Multi-agent system initialization failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 CompPrice Bot - Setup Test")
    print("=" * 50)
    
    # Check if .env exists
    if not os.path.exists('.env'):
        print("❌ .env file not found!")
        print("Please copy .env.example to .env and configure your OpenAI API key")
        return False
    
    tests = [
        test_imports,
        test_openai_connection,
        test_database,
        test_file_processor,
        test_agent_system
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        else:
            print(f"\n❌ Test failed: {test.__name__}")
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Your setup is ready.")
        print("\nNext steps:")
        print("1. Add your product catalog files to the docs/ folder")
        print("2. Run: python backend/app.py (for backend)")
        print("3. Run: cd frontend && npm start (for frontend)")
        print("4. Or use: ./start.sh (to start both)")
        return True
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)