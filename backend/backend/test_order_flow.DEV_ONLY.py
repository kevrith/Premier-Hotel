#!/usr/bin/env python3
"""
Test the complete order flow with customer information and payment method
"""
import sys
import os
import requests
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

API_URL = "http://localhost:8000/api/v1"

def test_complete_order_flow():
    """Test creating orders with all customer information and payment methods"""

    print("🧪 Testing Complete Order Flow with Customer Information\n")
    print("="*70)

    # Step 1: Login as waiter
    print("\n1️⃣ Logging in as waiter...")
    login_data = {
        "email": "waiter@premierhotel.com",
        "password": "Waiter@2024"
    }

    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")
            print(f"   ✅ Login successful!")
            print(f"   Token: {access_token[:50]}...")
        else:
            print(f"   ❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Step 2: Get menu items
    print("\n2️⃣ Fetching menu items...")
    try:
        response = requests.get(f"{API_URL}/menu/items", headers=headers)
        if response.status_code == 200:
            menu_items = response.json()
            print(f"   ✅ Found {len(menu_items)} menu items")
            if not menu_items:
                print("   ⚠️  No menu items found. Please add some menu items first.")
                return
            first_item = menu_items[0]
            print(f"   Using: {first_item['name']} (KES {first_item['base_price']})")
        else:
            print(f"   ❌ Failed to fetch menu: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return

    # Step 3: Test different order scenarios
    test_scenarios = [
        {
            "name": "Dine-In Order with Cash Payment",
            "data": {
                "location": "T-12",
                "location_type": "table",
                "items": [
                    {
                        "menu_item_id": first_item["id"],
                        "quantity": 2,
                        "customizations": {},
                        "special_instructions": "Extra sauce please"
                    }
                ],
                "special_instructions": "Customer prefers window seat",
                "customer_name": "John Doe",
                "customer_phone": "+254712345678",
                "order_type": "dine_in",
                "payment_method": "cash"
            }
        },
        {
            "name": "Room Service with Room Charge",
            "data": {
                "location": "305",
                "location_type": "room",
                "items": [
                    {
                        "menu_item_id": first_item["id"],
                        "quantity": 1,
                        "customizations": {},
                        "special_instructions": "No onions"
                    }
                ],
                "special_instructions": "Deliver to room 305",
                "customer_name": "Jane Smith",
                "customer_phone": "+254722345678",
                "order_type": "room_service",
                "payment_method": "room_charge"
            }
        },
        {
            "name": "Takeaway with M-Pesa",
            "data": {
                "location": "Takeaway",
                "location_type": "table",
                "items": [
                    {
                        "menu_item_id": first_item["id"],
                        "quantity": 3,
                        "customizations": {},
                        "special_instructions": ""
                    }
                ],
                "special_instructions": "",
                "customer_name": "Bob Johnson",
                "customer_phone": "+254733456789",
                "order_type": "walk_in",
                "payment_method": "mpesa"
            }
        },
        {
            "name": "Dine-In with Card Payment",
            "data": {
                "location": "T-05",
                "location_type": "table",
                "items": [
                    {
                        "menu_item_id": first_item["id"],
                        "quantity": 2,
                        "customizations": {},
                        "special_instructions": ""
                    }
                ],
                "special_instructions": "",
                "customer_name": "Alice Brown",
                "customer_phone": "+254744567890",
                "order_type": "dine_in",
                "payment_method": "card"
            }
        }
    ]

    created_orders = []

    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n{'='*70}")
        print(f"3️⃣.{i} Testing: {scenario['name']}")
        print(f"{'='*70}")

        order_data = scenario['data']

        print(f"   📝 Order Details:")
        print(f"      Customer: {order_data['customer_name']}")
        print(f"      Phone: {order_data['customer_phone']}")
        print(f"      Type: {order_data['order_type']}")
        print(f"      Payment: {order_data['payment_method']}")
        print(f"      Location: {order_data['location']} ({order_data['location_type']})")
        print(f"      Items: {order_data['items'][0]['quantity']} x {first_item['name']}")

        try:
            response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
            if response.status_code == 201:
                created_order = response.json()
                created_orders.append(created_order)

                print(f"\n   ✅ Order created successfully!")
                print(f"      Order Number: {created_order['order_number']}")
                print(f"      Total Amount: KES {created_order['total_amount']}")
                print(f"      Status: {created_order['status']}")

                # Verify customer fields
                order_id = created_order['id']
                response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)
                if response.status_code == 200:
                    order_details = response.json()
                    print(f"\n   🔍 Verifying saved fields:")
                    print(f"      ✅ Customer Name: {order_details.get('customer_name', 'NOT SET')}")
                    print(f"      ✅ Customer Phone: {order_details.get('customer_phone', 'NOT SET')}")
                    print(f"      ✅ Order Type: {order_details.get('order_type', 'NOT SET')}")
                    print(f"      ✅ Payment Method: {order_details.get('payment_method', 'NOT SET')}")
                    print(f"      ✅ Created By Staff: {order_details.get('created_by_staff_id', 'NOT SET')}")

                    if order_data['order_type'] == 'room_service':
                        print(f"      ✅ Room Number: {order_details.get('room_number', 'NOT SET')}")
                    elif order_data['order_type'] == 'dine_in':
                        print(f"      ✅ Table Number: {order_details.get('table_number', 'NOT SET')}")
            else:
                print(f"   ❌ Order creation failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except Exception as e:
            print(f"   ❌ Error: {e}")

    # Final Summary
    print(f"\n{'='*70}")
    print(f"📊 TEST SUMMARY")
    print(f"{'='*70}")
    print(f"   Total Scenarios Tested: {len(test_scenarios)}")
    print(f"   Orders Created Successfully: {len(created_orders)}")

    if len(created_orders) == len(test_scenarios):
        print(f"\n   ✅ ALL TESTS PASSED!")
        print(f"\n   Order Numbers Created:")
        for order in created_orders:
            print(f"      • {order['order_number']} - KES {order['total_amount']}")
    else:
        print(f"\n   ⚠️  Some tests failed. Check the output above.")

    print(f"\n{'='*70}\n")

if __name__ == "__main__":
    test_complete_order_flow()
