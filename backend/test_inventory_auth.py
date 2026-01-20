#!/usr/bin/env python3
"""
Test Inventory API Authentication
Checks if the current user can access inventory endpoints
"""
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

API_BASE_URL = "http://localhost:8000/api/v1"

def test_inventory_auth():
    """Test inventory API authentication"""
    print("=" * 60)
    print("🔍 Testing Inventory API Authentication")
    print("=" * 60)

    # Check if we have a token (this would come from browser localStorage)
    # For now, let's ask for a token
    token = input("Enter your JWT token from browser localStorage (auth-storage.token): ").strip()

    if not token:
        print("❌ No token provided")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print(f"\n🔑 Testing with token: {token[:20]}...")
    print("\nTesting inventory endpoints:\n")

    # Test 1: Get inventory items
    try:
        print("1. Testing GET /inventory/items...")
        response = requests.get(f"{API_BASE_URL}/inventory/items", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success - Found {len(data)} items")
        elif response.status_code == 403:
            print("   ❌ Forbidden - User doesn't have permission")
        elif response.status_code == 401:
            print("   ❌ Unauthorized - Invalid token")
        else:
            print(f"   ❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ❌ Connection error: {e}")

    # Test 2: Get inventory categories
    try:
        print("\n2. Testing GET /inventory/categories...")
        response = requests.get(f"{API_BASE_URL}/inventory/categories", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success - Found {len(data)} categories")
        elif response.status_code == 403:
            print("   ❌ Forbidden - User doesn't have permission")
        elif response.status_code == 401:
            print("   ❌ Unauthorized - Invalid token")
        else:
            print(f"   ❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ❌ Connection error: {e}")

    # Test 3: Get inventory alerts
    try:
        print("\n3. Testing GET /inventory/alerts...")
        response = requests.get(f"{API_BASE_URL}/inventory/alerts", headers=headers, timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success - Found {len(data)} alerts")
        elif response.status_code == 403:
            print("   ❌ Forbidden - User doesn't have permission")
        elif response.status_code == 401:
            print("   ❌ Unauthorized - Invalid token")
        else:
            print(f"   ❌ Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"   ❌ Connection error: {e}")

    print("\n" + "=" * 60)
    print("🔧 Troubleshooting Tips:")
    print("=" * 60)
    print("If you get 403 Forbidden:")
    print("  • User role may not be 'admin', 'manager', 'staff', 'chef', or 'waiter'")
    print("  • User status may not be 'active'")
    print("  • Check user profile in database")
    print()
    print("If you get 401 Unauthorized:")
    print("  • Token may be expired or invalid")
    print("  • Try logging out and logging back in")
    print()
    print("To get token from browser:")
    print("  1. Open browser dev tools (F12)")
    print("  2. Go to Application/Storage > Local Storage")
    print("  3. Find 'auth-storage' key")
    print("  4. Copy the 'token' value")

if __name__ == "__main__":
    test_inventory_auth()
