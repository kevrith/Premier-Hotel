#!/bin/bash

# Premier Hotel Management System - Start Script
# Starts both backend (FastAPI) and frontend (Vite)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID file to track processes
BACKEND_PID_FILE=".backend.pid"
FRONTEND_PID_FILE=".frontend.pid"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🏨 Premier Hotel Management System${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"

    # Kill backend if running
    if [ -f "$BACKEND_PID_FILE" ]; then
        BACKEND_PID=$(cat $BACKEND_PID_FILE)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
            kill $BACKEND_PID 2>/dev/null || true
        fi
        rm -f $BACKEND_PID_FILE
    fi

    # Kill frontend if running
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat $FRONTEND_PID_FILE)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
            kill $FRONTEND_PID 2>/dev/null || true
        fi
        rm -f $FRONTEND_PID_FILE
    fi

    echo -e "${GREEN}✅ Shutdown complete${NC}"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup INT TERM

# Check if already running
if [ -f "$BACKEND_PID_FILE" ] || [ -f "$FRONTEND_PID_FILE" ]; then
    echo -e "${YELLOW}⚠️  Application may already be running${NC}"
    echo -e "${YELLOW}Run ./stop.sh first to stop it${NC}"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    ./stop.sh 2>/dev/null || true
fi

# Check if backend virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo -e "${RED}❌ Backend virtual environment not found${NC}"
    echo -e "${YELLOW}Please run: cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}Starting Premier Hotel Management System...${NC}"
echo ""

# Start Backend
echo -e "${BLUE}🔧 Starting Backend (FastAPI)...${NC}"
cd backend
./venv/bin/python3.12 -m uvicorn app.main:app --reload --port 8000 > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo $BACKEND_PID > $BACKEND_PID_FILE
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
echo -e "${GREEN}   URL: http://localhost:8000${NC}"
echo -e "${GREEN}   API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}   Logs: backend.log${NC}"
echo ""

# Wait a bit for backend to start
sleep 3

# Check if backend is running
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo -e "${YELLOW}Check backend.log for errors${NC}"
    tail -20 backend.log
    rm -f $BACKEND_PID_FILE
    exit 1
fi

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend (Vite)...${NC}"
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > $FRONTEND_PID_FILE
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
echo -e "${GREEN}   URL: http://localhost:5173${NC}"
echo -e "${GREEN}   Logs: frontend.log${NC}"
echo ""

# Wait a bit for frontend to start
sleep 3

# Check if frontend is running
if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo -e "${RED}❌ Frontend failed to start${NC}"
    echo -e "${YELLOW}Check frontend.log for errors${NC}"
    tail -20 frontend.log
    cleanup
    exit 1
fi

echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}🎉 Application Started Successfully!${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${GREEN}📱 Frontend:${NC}    http://localhost:5173"
echo -e "${GREEN}🔧 Backend:${NC}     http://localhost:8000"
echo -e "${GREEN}📚 API Docs:${NC}    http://localhost:8000/docs"
echo ""
echo -e "${YELLOW}📋 Quick Start:${NC}"
echo -e "   1. Open http://localhost:5173 in your browser"
echo -e "   2. Create admin account: cd backend && ./create_admin.sh"
echo -e "   3. Login with your credentials"
echo ""
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "   Backend:  tail -f backend.log"
echo -e "   Frontend: tail -f frontend.log"
echo ""
echo -e "${YELLOW}🛑 To stop:${NC}"
echo -e "   Press Ctrl+C or run: ./stop.sh"
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${GREEN}Application is running... Press Ctrl+C to stop${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Keep script running and tail logs
tail -f backend.log -f frontend.log
