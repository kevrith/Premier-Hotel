#!/bin/bash

# Premier Hotel Management System - Status Check
# Check if backend and frontend are running

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID files
BACKEND_PID_FILE=".backend.pid"
FRONTEND_PID_FILE=".frontend.pid"

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}🏨 Premier Hotel - Application Status${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

BACKEND_RUNNING=0
FRONTEND_RUNNING=0

# Check backend
echo -e "${BLUE}🔧 Backend Status:${NC}"
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat $BACKEND_PID_FILE)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Running${NC} (PID: $BACKEND_PID)"
        echo -e "   ${GREEN}📍 http://localhost:8000${NC}"
        echo -e "   ${GREEN}📚 http://localhost:8000/docs${NC}"
        BACKEND_RUNNING=1

        # Check if actually responding
        if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Health check: OK${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Health check: Not responding${NC}"
        fi
    else
        echo -e "   ${RED}❌ Not running${NC} (stale PID file)"
    fi
else
    echo -e "   ${RED}❌ Not running${NC}"
fi

echo ""

# Check frontend
echo -e "${BLUE}🎨 Frontend Status:${NC}"
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat $FRONTEND_PID_FILE)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "   ${GREEN}✅ Running${NC} (PID: $FRONTEND_PID)"
        echo -e "   ${GREEN}📍 http://localhost:5173${NC}"
        FRONTEND_RUNNING=1

        # Check if actually responding
        if curl -s http://localhost:5173 > /dev/null 2>&1; then
            echo -e "   ${GREEN}✅ Server check: OK${NC}"
        else
            echo -e "   ${YELLOW}⚠️  Server check: Not responding${NC}"
        fi
    else
        echo -e "   ${RED}❌ Not running${NC} (stale PID file)"
    fi
else
    echo -e "   ${RED}❌ Not running${NC}"
fi

echo ""

# Check processes manually
echo -e "${BLUE}🔍 Process Check:${NC}"
UVICORN_COUNT=$(pgrep -f "uvicorn app.main:app" 2>/dev/null | wc -l)
VITE_COUNT=$(pgrep -f "vite" 2>/dev/null | wc -l)

echo -e "   Uvicorn processes: $UVICORN_COUNT"
echo -e "   Vite processes: $VITE_COUNT"

echo ""

# Overall status
echo -e "${BLUE}============================================================${NC}"
if [ $BACKEND_RUNNING -eq 1 ] && [ $FRONTEND_RUNNING -eq 1 ]; then
    echo -e "${GREEN}✅ Application is RUNNING${NC}"
    echo ""
    echo -e "${YELLOW}Quick Links:${NC}"
    echo -e "   Frontend:  http://localhost:5173"
    echo -e "   Backend:   http://localhost:8000"
    echo -e "   API Docs:  http://localhost:8000/docs"
    echo ""
    echo -e "${YELLOW}View Logs:${NC}"
    echo -e "   Backend:   tail -f backend.log"
    echo -e "   Frontend:  tail -f frontend.log"
    echo ""
    echo -e "${YELLOW}Stop App:${NC}"
    echo -e "   ./stop.sh"
elif [ $BACKEND_RUNNING -eq 1 ] || [ $FRONTEND_RUNNING -eq 1 ]; then
    echo -e "${YELLOW}⚠️  Application is PARTIALLY RUNNING${NC}"
    echo ""
    echo -e "Run ./stop.sh then ./start.sh to restart properly"
else
    echo -e "${RED}❌ Application is NOT RUNNING${NC}"
    echo ""
    echo -e "Run ./start.sh to start the application"
fi
echo -e "${BLUE}============================================================${NC}"
echo ""
