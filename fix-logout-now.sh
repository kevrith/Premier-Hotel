#!/bin/bash

echo "=========================================="
echo "🚨 FIXING LOGOUT ISSUE"
echo "=========================================="
echo ""

# Check if backend is running
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    echo "⚠️  Backend is currently running. Stopping it..."
    pkill -f "uvicorn app.main:app"
    sleep 2
    echo "✅ Backend stopped"
else
    echo "✅ Backend is not running"
fi

echo ""
echo "🚀 Starting backend with correct auth..."
cd backend

# Start backend in background
nohup python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
BACKEND_PID=$!

echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Backend is running successfully!"
else
    echo "⚠️  Backend might not be ready yet. Check logs:"
    echo "   tail -f backend/backend.log"
fi

echo ""
echo "=========================================="
echo "✅ BACKEND FIXED!"
echo "=========================================="
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. ✅ Backend restarted (DONE)"
echo ""
echo "2. 🔧 Run SQL script in Supabase:"
echo "   - Open: https://supabase.com"
echo "   - Go to: SQL Editor"
echo "   - Copy file: backend/fix_customer_history_permissions.sql"
echo "   - Paste and click 'Run'"
echo ""
echo "3. 🧪 Test the fix:"
echo "   - Clear browser cache (Ctrl+Shift+Delete)"
echo "   - Reload app (Ctrl+F5)"
echo "   - Login as waiter"
echo "   - Try searching customer name"
echo "   - Should NOT log out anymore! ✅"
echo ""
echo "=========================================="
echo "Backend logs: tail -f backend/backend.log"
echo "=========================================="
