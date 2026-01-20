#!/bin/bash

# Premier Hotel - Create Super Admin Script
# Run this to create your initial admin account

echo "============================================================"
echo "🔐 Premier Hotel - Create Super Admin Account"
echo "============================================================"
echo ""
echo "This will create your initial admin account."
echo "You'll be able to login and create other staff accounts."
echo ""

# Run the Python script (v2 uses signup method)
./venv/bin/python3.12 create_super_admin_v2.py

echo ""
echo "Next steps:"
echo "1. Start the application: cd .. && ./start.sh"
echo "2. Login at: http://localhost:5173/login"
echo "3. Create staff accounts from Admin Dashboard"
echo ""
