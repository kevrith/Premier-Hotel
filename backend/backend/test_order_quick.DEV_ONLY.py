#!/usr/bin/env python3
"""
Quick order test with fresh user registration
"""
import requests
import json
import time

API_URL = "http://localhost:8000/api/v1"

print("🧪 Quick Order Flow Test\n")
print("="*70)

# Use timestamp to ensure unique email
timestamp = str(int(time.time()))
email = f"ordertest{timestamp}@test.com"

# Step 1: Register brand new user
print(f"\n1️⃣ Registering new user: {email}...")
register_data = {
    "email": email,
    "password": "TestOrder@123",
    "full_name": "Order Test User",
    "phone": "+254799999999"
}

try:
    response = requests.post(f"{API_URL}/auth/register", json=register_data)
    print(f"   Status: {response.status_code}")

    if response.status_code in [200, 201]:
        user_data = response.json()
        access_token = user_data.get("access_token")
        print(f"   ✅ Registration successful!")
    else:
        print(f"   ❌ Registration failed")
        print(f"   Response: {response.text}")
        exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    exit(1)

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Step 2: Create order with customer info and payment method
print("\n2️⃣ Creating order with all customer fields...")

order_data = {
    "location": "T-20",
    "location_type": "table",
    "items": [
        {
            "menu_item_id": "550e8400-e29b-41d4-a716-446655440000",  # Mock menu item ID
            "quantity": 1,
            "name": "Test Dish",
            "price": 800,
            "customizations": {},
            "special_instructions": ""
        }
    ],
    "special_instructions": "Test order",
    # Customer Information Fields
    "customer_name": "John Doe",
    "customer_phone": "+254711222333",
    "order_type": "dine_in",
    "payment_method": "cash"
}

print(f"\n   📋 Order Data:")
for key in ["customer_name", "customer_phone", "order_type", "payment_method"]:
    print(f"      {key}: {order_data[key]}")

try:
    response = requests.post(f"{API_URL}/orders", json=order_data, headers=headers)
    print(f"\n   Response Status: {response.status_code}")

    if response.status_code == 201:
        order = response.json()
        print(f"\n   ✅ ORDER CREATED!")
        print(f"      Order #: {order.get('order_number', 'N/A')}")
        print(f"      Total: KES {order.get('total_amount', 'N/A')}")

        # Verify fields
        print(f"\n3️⃣ Verifying saved fields...")
        order_id = order.get('id')
        verify = requests.get(f"{API_URL}/orders/{order_id}", headers=headers)

        if verify.status_code == 200:
            details = verify.json()
            print(f"\n   Verification Results:")
            print(f"      Customer Name: {details.get('customer_name', '❌ NOT SAVED')}")
            print(f"      Customer Phone: {details.get('customer_phone', '❌ NOT SAVED')}")
            print(f"      Order Type: {details.get('order_type', '❌ NOT SAVED')}")
            print(f"      Payment Method: {details.get('payment_method', '❌ NOT SAVED')}")
            print(f"      Table Number: {details.get('table_number', '❌ NOT SAVED')}")

            # Success check
            if all([
                details.get('customer_name') == "John Doe",
                details.get('payment_method') == "cash"
            ]):
                print(f"\n{'='*70}")
                print("✅ SUCCESS! All customer fields saved correctly!")
                print(f"{'='*70}\n")
            else:
                print(f"\n⚠️  Some fields not saved correctly")
    else:
        print(f"\n   ❌ Failed to create order")
        print(f"   Response: {response.text}")

except Exception as e:
    print(f"\n   ❌ Error: {e}")
    import traceback
    traceback.print_exc()
