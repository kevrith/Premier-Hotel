#!/bin/bash

echo "========================================="
echo "Restarting Premier Hotel Application"
echo "========================================="
echo ""

# Kill all existing processes
echo "Stopping existing servers..."
pkill -f "uvicorn" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "node.*vite" 2>/dev/null
sleep 3

# Clean Vite cache
echo "Cleaning Vite cache..."
rm -rf node_modules/.vite
rm -rf .vite

# Start backend
echo "Starting backend on port 8000..."
cd /home/kelvin/Desktop/Premier-Hotel/backend
./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend-app.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend on port 5173..."
cd /home/kelvin/Desktop/Premier-Hotel
npm run dev > /tmp/frontend-app.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
sleep 8

echo ""
echo "========================================="
echo "Application Started Successfully!"
echo "========================================="
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/backend-app.log"
echo "  Frontend: tail -f /tmp/frontend-app.log"
echo ""

# Test connectivity
echo "Testing connectivity..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173)

if [ "$BACKEND_STATUS" = "200" ]; then
  echo "✓ Backend is responding (HTTP $BACKEND_STATUS)"
else
  echo "✗ Backend issue (HTTP $BACKEND_STATUS)"
  echo "  Check: tail -f /tmp/backend-app.log"
fi

if [ "$FRONTEND_STATUS" = "200" ]; then
  echo "✓ Frontend is responding (HTTP $FRONTEND_STATUS)"
else
  echo "✗ Frontend issue (HTTP $FRONTEND_STATUS)"
  echo "  Check: tail -f /tmp/frontend-app.log"
fi

echo ""
echo "To stop the servers, run: pkill -f uvicorn && pkill -f vite"
echo "========================================="
