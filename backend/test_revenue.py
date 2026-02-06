#!/usr/bin/env python3
"""Comprehensive test to diagnose revenue calculation issues"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000/api/v1"

print("=" * 80)
print("COMPREHENSIVE REVENUE DIAGNOSTIC TEST")
print("=" * 80)

# Test 1: Check if orders exist
print("\n1. TESTING ORDERS ENDPOINT")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/orders/")
    if response.status_code == 200:
        orders = response.json()
        print(f"✅ Found {len(orders)} orders")
        if orders:
            sample = orders[0]
            print(f"\nSample order structure:")
            print(f"  - ID: {sample.get('id', 'N/A')[:8]}...")
            print(f"  - Status: '{sample.get('status', 'N/A')}'")
            print(f"  - Total: {sample.get('total', 'N/A')}")
            print(f"  - Subtotal: {sample.get('subtotal', 'N/A')}")
            print(f"  - Tax: {sample.get('tax', 'N/A')}")
            print(f"  - Assigned Waiter: {sample.get('assigned_waiter_id', 'N/A')}")
            print(f"  - Assigned Chef: {sample.get('assigned_chef_id', 'N/A')}")
    else:
        print(f"❌ Error: {response.status_code}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 2: Check manager orders endpoint
print("\n2. TESTING MANAGER ORDERS ENDPOINT")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/orders/manager/manager?date=today")
    if response.status_code == 200:
        orders = response.json()
        print(f"✅ Found {len(orders)} orders today")
        if orders:
            sample = orders[0]
            print(f"\nSample manager order:")
            print(f"  - Order #: {sample.get('order_number', 'N/A')}")
            print(f"  - Status: '{sample.get('status', 'N/A')}'")
            print(f"  - Total Amount: {sample.get('total_amount', 'N/A')}")
            
            # Count by status
            statuses = {}
            for o in orders:
                status = o.get('status', 'unknown')
                statuses[status] = statuses.get(status, 0) + 1
            print(f"\nOrders by status:")
            for status, count in statuses.items():
                print(f"  - {status}: {count}")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 3: Check stats endpoint
print("\n3. TESTING STATS ENDPOINT")
print("-" * 80)
try:
    today = datetime.now().date().isoformat()
    response = requests.get(f"{BASE_URL}/orders/manager/stats?start_date={today}&end_date={today}")
    if response.status_code == 200:
        stats = response.json()
        print(f"✅ Stats retrieved successfully")
        print(f"  - Today's Orders: {stats.get('today_orders', 0)}")
        print(f"  - Completed Orders: {stats.get('completed_orders', 0)}")
        print(f"  - Total Revenue: KES {stats.get('total_revenue', 0):,.2f}")
        print(f"  - Completion Rate: {stats.get('completion_rate', 0)}%")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 4: Check daily sales endpoint
print("\n4. TESTING DAILY SALES ENDPOINT")
print("-" * 80)
try:
    today = datetime.now().date().isoformat()
    response = requests.get(f"{BASE_URL}/orders/manager/daily-sales?start_date={today}&end_date={today}")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Daily sales retrieved successfully")
        print(f"  - Total Revenue: KES {data.get('total_revenue', 0):,.2f}")
        print(f"  - Total Orders: {data.get('total_orders', 0)}")
        print(f"  - Daily Breakdown: {len(data.get('daily_breakdown', []))} days")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 5: Check staff endpoint
print("\n5. TESTING STAFF ENDPOINT")
print("-" * 80)
try:
    response = requests.get(f"{BASE_URL}/staff")
    if response.status_code == 200:
        staff = response.json()
        print(f"✅ Found {len(staff)} staff members")
        waiters = [s for s in staff if s.get('role') == 'waiter']
        chefs = [s for s in staff if s.get('role') == 'chef']
        print(f"  - Waiters: {len(waiters)}")
        print(f"  - Chefs: {len(chefs)}")
        if waiters:
            print(f"\nSample waiter: {waiters[0].get('full_name', 'N/A')} (ID: {waiters[0].get('id', 'N/A')[:8]}...)")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

print("\n" + "=" * 80)
print("DIAGNOSTIC COMPLETE")
print("=" * 80)
