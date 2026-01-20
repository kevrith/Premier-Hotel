#!/usr/bin/env python3
"""
Simple test - Register a new user and create an order
"""
import requests
import json

API_URL = "http://localhost:8000/api/v1"

print("🧪 Testing Order Flow - Simple Version\n")
print("="*70)

# Step 1: Register a new user
print("\n1️⃣ Registering new test user...")
register_data = {
    "email": f"testuser{hash('test')}@test.com",
    "password": "Test@123456",
    "full_name": "Test User",
    "phone": "+254712345678"
}

try:
    response = requests.post(f"{API_URL}/auth/register", json=register_data)
    if response.status_code in [200, 201]:
        user_data = response.json()
        access_token = user_data.get("access_token")
        print(f"   ✅ Registration successful!")
        print(f"   Email: {register_data['email']}")
    elif "already exists" in response.text.lower() or "duplicate" in response.text.lower():
        # Try logging in instead
        print("   ℹ️  User exists, logging in...")
        login_response = requests.post(f"{API_URL}/auth/login", json={
            "email": register_data['email'],
            "password": register_data['password']
        })
        if login_response.status_code == 200:
            user_data = login_response.json()
            access_token = user_data.get("access_token")
            print(f"   ✅ Login successful!")
        else:
            print(f"   ❌ Login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            exit(1)
    else:
        print(f"   ❌ Registration failed: {response.status_code}")
        print(f"   Response: {response.text}")
        exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

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
            print("   ⚠️  No menu items found. Creating test order with mock data...")
            # We'll still test the API endpoint structure
            first_item = {
                "id": "test-item-1",
                "name": "Test Item",
                "base_price": 500
            }
        else:
            first_item = menu_items[0]
            print(f"   Using: {first_item['name']} (KES {first_item['base_price']})")
    else:
        print(f"   ⚠️  Could not fetch menu: {response.status_code}, using test data...")
        first_item = {
            "id": "test-item-1",
            "name": "Test Item",
            "base_price": 500
        }
except Exception as e:
    print(f"   ⚠️  Error fetching menu: {e}, using test data...")
    first_item = {
        "id": "test-item-1",
        "name": "Test Item",
        "base_price": 500
    }

# Step 3: Create order with ALL new fields
print("\n3️⃣ Creating order with customer information and payment method...")

order_data = {
    "location": "T-15",
    "location_type": "table",
    "items": [
        {
            "menu_item_id": first_item["id"],
            "quantity": 2,
            "customizations": {},
            "special_instructions": "Extra sauce"
        }
    ],
    "special_instructions": "Window seat preferred",
    # NEW FIELDS - Customer Information
    "customer_name": "Test Customer",
    "customer_phone": "+254798123456",
    "order_type": "dine_in",
    "payment_method": "cash"
}

print(f"\n   📝 Order Request Data:")
print(json.dumps(order_data, indent=2))

try:
    response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
    print(f"\n   Response Status: {response.status_code}")

    if response.status_code == 201:
        created_order = response.json()
        print(f"\n   ✅ ORDER CREATED SUCCESSFULLY!")
        print(f"      Order Number: {created_order.get('order_number')}")
        print(f"      Total Amount: KES {created_order.get('total_amount')}")
        print(f"      Status: {created_order.get('status')}")

        # Verify customer fields were saved
        order_id = created_order.get('id')
        print(f"\n4️⃣ Verifying customer fields in database...")
        verify_response = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)

        if verify_response.status_code == 200:
            order_details = verify_response.json()
            print(f"\n   🔍 Saved Customer Fields:")
            print(f"      ✅ Customer Name: {order_details.get('customer_name', 'NOT SET')}")
            print(f"      ✅ Customer Phone: {order_details.get('customer_phone', 'NOT SET')}")
            print(f"      ✅ Order Type: {order_details.get('order_type', 'NOT SET')}")
            print(f"      ✅ Payment Method: {order_details.get('payment_method', 'NOT SET')}")
            print(f"      ✅ Table Number: {order_details.get('table_number', 'NOT SET')}")
            print(f"      ✅ Created By Staff: {order_details.get('created_by_staff_id', 'NOT SET')}")

            # Check if all fields are properly set
            all_fields_set = all([
                order_details.get('customer_name') == "Test Customer",
                order_details.get('customer_phone') == "+254798123456",
                order_details.get('order_type') == "dine_in",
                order_details.get('payment_method') == "cash"
            ])

            if all_fields_set:
                print(f"\n{'='*70}")
                print("✅ ALL TESTS PASSED! Order flow working correctly!")
                print(f"{'='*70}\n")
            else:
                print(f"\n{'='*70}")
                print("⚠️  Some fields may not be saved correctly")
                print(f"{'='*70}\n")
        else:
            print(f"   ⚠️  Could not verify order: {verify_response.status_code}")

    else:
        print(f"\n   ❌ Order creation failed!")
        print(f"      Status Code: {response.status_code}")
        print(f"      Response: {response.text}")

        # Try to parse error details
        try:
            error_data = response.json()
            print(f"\n   Error Details:")
            print(json.dumps(error_data, indent=2))
        except:
            pass

except Exception as e:
    print(f"\n   ❌ Error: {e}")
    import traceback
    traceback.print_exc()
