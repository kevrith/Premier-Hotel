#!/bin/bash
echo "==================================="
echo "Showing last 100 lines of backend log with AUTH DEBUG info"
echo "==================================="
echo ""
tail -100 /home/kelvin/Desktop/Premier-Hotel/backend/backend.log | grep -A 20 "=== AUTH DEBUG ===" | tail -60
echo ""
echo "==================================="
echo "Press Ctrl+C to stop watching logs"
echo "==================================="
echo ""
tail -f /home/kelvin/Desktop/Premier-Hotel/backend/backend.log | grep --line-buffered -A 10 "=== AUTH DEBUG ==="
