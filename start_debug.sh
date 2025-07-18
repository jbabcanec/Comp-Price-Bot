#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 CompPrice Bot Debug Startup${NC}"
echo "=================================="

# Kill any existing processes
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "python app.py" 2>/dev/null || true
pkill -f "npm start" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
sleep 2

# Check if venv exists
if [ ! -d "venv" ]; then
    echo -e "${RED}❌ Virtual environment not found${NC}"
    exit 1
fi

# Test backend first
echo -e "${BLUE}🔧 Testing backend...${NC}"
cd backend
source ../venv/bin/activate

echo -e "${YELLOW}Testing imports...${NC}"
python -c "
try:
    from services import HVACCompetitiveIntelligenceSystem, FileProcessor
    from models import db, CompetitorMatch
    print('✅ All imports successful')
except Exception as e:
    print(f'❌ Import error: {e}')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend import test failed${NC}"
    exit 1
fi

# Start backend
echo -e "${BLUE}🔧 Starting backend...${NC}"
python app.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Test backend connection
echo -e "${YELLOW}Testing backend connection...${NC}"
if curl -s -f http://localhost:5001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is running on port 5001${NC}"
else
    echo -e "${RED}❌ Backend failed to start${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Test frontend compilation
echo -e "${BLUE}🎨 Testing frontend compilation...${NC}"
cd frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend compiles successfully${NC}"
else
    echo -e "${RED}❌ Frontend compilation failed${NC}"
    echo "Running build to show errors:"
    npm run build
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend
echo -e "${BLUE}🎨 Starting frontend...${NC}"
npm start &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
sleep 8

# Test frontend connection
if curl -s -f http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend is running on port 3000${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Both services are running successfully!${NC}"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:5001"
echo "📋 Logs: logs/backend.log and logs/frontend.log"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    pkill -f "python app.py" 2>/dev/null || true
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    echo -e "${GREEN}✅ Services stopped${NC}"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Keep script running and show live logs
echo -e "${BLUE}📋 Live logs (Ctrl+C to stop):${NC}"
echo "=================================="

# Show logs in real-time
tail -f logs/backend.log logs/frontend.log &
TAIL_PID=$!

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID