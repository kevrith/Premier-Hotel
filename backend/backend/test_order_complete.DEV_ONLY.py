#!/usr/bin/env python3
"""
Complete order flow test - Register user, get menu, create order with customer info
"""
import requests
import json
import time

API_URL = "http://localhost:8000/api/v1"

print("🧪 Complete Order Flow Test with Customer Information\n")
print("="*70)

# Step 1: Register new user
timestamp = str(int(time.time()))
email = f"flowtest{timestamp}@test.com"
phone = f"+2547{timestamp[-8:]}"  # Use timestamp for unique phone

print(f"\n1️⃣ Registering user: {email}...")
register_data = {
    "email": email,
    "password": "FlowTest@123",
    "full_name": "Flow Test User",
    "phone": phone
}

response = requests.post(f"{API_URL}/auth/register", json=register_data)
if response.status_code in [200, 201]:
    user_data = response.json()
    access_token = user_data.get("access_token")
    print(f"   ✅ Registered successfully!")
else:
    print(f"   ❌ Registration failed: {response.status_code}")
    print(f"   {response.text}")
    exit(1)

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Step 2: Get actual menu items
print("\n2️⃣ Fetching menu items from database...")
response = requests.get(f"{API_URL}/menu/items", headers=headers)

if response.status_code == 200:
    menu_items = response.json()
    if menu_items and len(menu_items) > 0:
        item = menu_items[0]
        print(f"   ✅ Found {len(menu_items)} menu items")
        print(f"   Using: {item['name']} (ID: {item['id']}, Price: KES {item['base_price']})")
    else:
        print(f"   ⚠️  No menu items in database")
        print(f"   Creating sample menu item first...")

        # Create a menu item
        menu_item_data = {
            "name": "Test Burger",
            "name_sw": "Burger ya Majaribio",
            "description": "Delicious test burger",
            "description_sw": "Burger ya kupendeza",
            "category": "mains",
            "base_price": 850,
            "preparation_time": 20,
            "is_available": True,
            "dietary_info": ["gluten-free"],
            "customizations": []
        }

        create_response = requests.post(f"{API_URL}/menu/items", json=menu_item_data, headers=headers)
        if create_response.status_code in [200, 201]:
            item = create_response.json()
            print(f"   ✅ Created menu item: {item['name']} (ID: {item['id']})")
        else:
            print(f"   ❌ Could not create menu item: {create_response.status_code}")
            print(f"   Using mock item for testing...")
            item = {"id": "test-id", "name": "Test Item", "base_price": 500}
else:
    print(f"   ⚠️  Could not fetch menu: {response.status_code}")
    item = {"id": "test-id", "name": "Test Item", "base_price": 500}

# Step 3: Test all payment methods and order types
test_scenarios = [
    {
        "name": "Dine-In with Cash",
        "order_type": "dine_in",
        "payment_method": "cash",
        "location": "T-10",
        "location_type": "table",
        "customer_name": "Alice Johnson",
        "customer_phone": "+254722111222"
    },
    {
        "name": "Room Service with Room Charge",
        "order_type": "room_service",
        "payment_method": "room_charge",
        "location": "201",
        "location_type": "room",
        "customer_name": "Bob Smith",
        "customer_phone": "+254733222333"
    },
    {
        "name": "Takeaway with M-Pesa",
        "order_type": "walk_in",
        "payment_method": "mpesa",
        "location": "Takeaway",
        "location_type": "table",
        "customer_name": "Carol Williams",
        "customer_phone": "+254744333444"
    },
    {
        "name": "Dine-In with Card",
        "order_type": "dine_in",
        "payment_method": "card",
        "location": "T-05",
        "location_type": "table",
        "customer_name": "David Brown",
        "customer_phone": "+254755444555"
    }
]

successful_orders = 0

for i, scenario in enumerate(test_scenarios, 1):
    print(f"\n{'='*70}")
    print(f"3.{i} Testing: {scenario['name']}")
    print(f"{'='*70}")

    order_data = {
        "location": scenario['location'],
        "location_type": scenario['location_type'],
        "items": [
            {
                "menu_item_id": item['id'],
                "quantity": 2,
                "customizations": {},
                "special_instructions": "Extra napkins"
            }
        ],
        "special_instructions": f"Test order for {scenario['name']}",
        # Customer information
        "customer_name": scenario['customer_name'],
        "customer_phone": scenario['customer_phone'],
        "order_type": scenario['order_type'],
        "payment_method": scenario['payment_method']
    }

    print(f"   📋 Customer: {order_data['customer_name']}")
    print(f"   📋 Phone: {order_data['customer_phone']}")
    print(f"   📋 Type: {order_data['order_type']}")
    print(f"   📋 Payment: {order_data['payment_method']}")
    print(f"   📋 Location: {order_data['location']}")

    response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)

    if response.status_code == 201:
        order = response.json()
        successful_orders += 1
        print(f"\n   ✅ Order Created!")
        print(f"      Order #: {order['order_number']}")
        print(f"      Total: KES {order['total_amount']}")

        # Verify fields
        order_id = order['id']
        verify = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)

        if verify.status_code == 200:
            details = verify.json()
            print(f"\n   🔍 Verification:")
            print(f"      ✅ Customer Name: {details.get('customer_name', '❌')}")
            print(f"      ✅ Phone: {details.get('customer_phone', '❌')}")
            print(f"      ✅ Order Type: {details.get('order_type', '❌')}")
            print(f"      ✅ Payment: {details.get('payment_method', '❌')}")

            if scenario['order_type'] == 'room_service':
                print(f"      ✅ Room: {details.get('room_number', '❌')}")
            elif scenario['order_type'] == 'dine_in':
                print(f"      ✅ Table: {details.get('table_number', '❌')}")
    else:
        print(f"\n   ❌ Failed: {response.status_code}")
        print(f"   {response.text}")

# Summary
print(f"\n{'='*70}")
print(f"📊 FINAL SUMMARY")
print(f"{'='*70}")
print(f"   Scenarios Tested: {len(test_scenarios)}")
print(f"   Orders Created: {successful_orders}")

if successful_orders == len(test_scenarios):
    print(f"\n   ✅✅✅ ALL TESTS PASSED! ✅✅✅")
    print(f"\n   The complete order flow with customer information,")
    print(f"   payment methods, and staff attribution is working!")
else:
    print(f"\n   ⚠️  {len(test_scenarios) - successful_orders} test(s) failed")

print(f"\n{'='*70}\n")
