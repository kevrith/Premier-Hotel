#!/bin/bash

# Premier Hotel Management System - Stop Script
# Stops both backend and frontend

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
echo -e "${BLUE}🏨 Premier Hotel - Stopping Application${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

STOPPED=0

# Stop backend
if [ -f "$BACKEND_PID_FILE" ]; then
    BACKEND_PID=$(cat $BACKEND_PID_FILE)
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping backend (PID: $BACKEND_PID)...${NC}"
        kill $BACKEND_PID 2>/dev/null || true
        sleep 2

        # Force kill if still running
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force stopping backend...${NC}"
            kill -9 $BACKEND_PID 2>/dev/null || true
        fi

        echo -e "${GREEN}✅ Backend stopped${NC}"
        STOPPED=1
    else
        echo -e "${YELLOW}Backend not running${NC}"
    fi
    rm -f $BACKEND_PID_FILE
else
    echo -e "${YELLOW}No backend PID file found${NC}"
fi

# Stop frontend
if [ -f "$FRONTEND_PID_FILE" ]; then
    FRONTEND_PID=$(cat $FRONTEND_PID_FILE)
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping frontend (PID: $FRONTEND_PID)...${NC}"
        kill $FRONTEND_PID 2>/dev/null || true
        sleep 2

        # Force kill if still running
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${YELLOW}Force stopping frontend...${NC}"
            kill -9 $FRONTEND_PID 2>/dev/null || true
        fi

        echo -e "${GREEN}✅ Frontend stopped${NC}"
        STOPPED=1
    else
        echo -e "${YELLOW}Frontend not running${NC}"
    fi
    rm -f $FRONTEND_PID_FILE
else
    echo -e "${YELLOW}No frontend PID file found${NC}"
fi

# Also kill any uvicorn or vite processes (cleanup)
echo ""
echo -e "${YELLOW}Cleaning up any remaining processes...${NC}"

# Kill any uvicorn processes
UVICORN_PIDS=$(pgrep -f "uvicorn app.main:app" 2>/dev/null || true)
if [ ! -z "$UVICORN_PIDS" ]; then
    echo -e "${YELLOW}Killing remaining uvicorn processes: $UVICORN_PIDS${NC}"
    kill $UVICORN_PIDS 2>/dev/null || true
fi

# Kill any vite processes
VITE_PIDS=$(pgrep -f "vite" 2>/dev/null || true)
if [ ! -z "$VITE_PIDS" ]; then
    echo -e "${YELLOW}Killing remaining vite processes: $VITE_PIDS${NC}"
    kill $VITE_PIDS 2>/dev/null || true
fi

echo ""
if [ $STOPPED -eq 1 ]; then
    echo -e "${GREEN}✅ Application stopped successfully${NC}"
else
    echo -e "${YELLOW}Application was not running${NC}"
fi

echo ""
echo -e "${BLUE}To start again, run: ./start.sh${NC}"
echo ""
