#!/bin/bash
# ============================================================
# Premier Hotel — Local Network Startup Script
# Run this on the server PC. Staff connect via WiFi using the
# URL printed below. No internet needed once the app is loaded.
# ============================================================

set -e
cd "$(dirname "$0")"

# Get local network IP
LOCAL_IP=$(hostname -I | awk '{print $1}')
BACKEND_PORT=8000
FRONTEND_PORT=5173

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          Premier Hotel Management System             ║"
echo "╠══════════════════════════════════════════════════════╣"
printf "║  Server IP  : %-38s ║\n" "$LOCAL_IP"
printf "║  Backend    : http://%-31s ║\n" "$LOCAL_IP:$BACKEND_PORT"
printf "║  Staff URL  : http://%-31s ║\n" "$LOCAL_IP:$FRONTEND_PORT"
echo "╠══════════════════════════════════════════════════════╣"
echo "║  Staff: connect to hotel WiFi then open the URL above ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# ── Backend ─────────────────────────────────────────────────
echo "▶  Starting backend..."
cd backend
if [ ! -d "venv" ]; then
  echo "   Creating Python venv..."
  python3 -m venv venv
  venv/bin/pip install -r requirements.txt -q
fi

# Kill any old instance on port 8000
fuser -k ${BACKEND_PORT}/tcp 2>/dev/null || true
sleep 1

nohup venv/bin/python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port $BACKEND_PORT \
  --reload \
  > /tmp/hotel-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID (logs: /tmp/hotel-backend.log)"
cd ..

# Wait for backend to be ready
echo "   Waiting for backend..."
for i in {1..15}; do
  if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    echo "   Backend ready ✓"
    break
  fi
  sleep 1
done

# ── Frontend ─────────────────────────────────────────────────
echo ""
echo "▶  Starting frontend..."

# Kill any old instance on port 5173
fuser -k ${FRONTEND_PORT}/tcp 2>/dev/null || true
sleep 1

nohup npx vite --host 0.0.0.0 --port $FRONTEND_PORT \
  > /tmp/hotel-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID (logs: /tmp/hotel-frontend.log)"

sleep 3
echo ""
echo "══════════════════════════════════════════════════════"
echo "  System is running!"
echo ""
echo "  Open on this computer : http://localhost:$FRONTEND_PORT"
echo "  Open on staff phones  : http://$LOCAL_IP:$FRONTEND_PORT"
echo ""
echo "  Staff roles & URLs:"
echo "    Waiter    → http://$LOCAL_IP:$FRONTEND_PORT/waiter"
echo "    Chef/KDS  → http://$LOCAL_IP:$FRONTEND_PORT/chef"
echo "    Cleaner   → http://$LOCAL_IP:$FRONTEND_PORT/cleaner"
echo "    Manager   → http://$LOCAL_IP:$FRONTEND_PORT/manager"
echo "    Admin     → http://$LOCAL_IP:$FRONTEND_PORT/admin"
echo ""
echo "  Press Ctrl+C to stop"
echo "══════════════════════════════════════════════════════"

# Save PIDs
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# Follow backend logs
tail -f /tmp/hotel-backend.log
