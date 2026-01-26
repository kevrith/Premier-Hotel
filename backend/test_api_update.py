#!/usr/bin/env python3
"""
Test API Order Update - Direct API call to test the order status update endpoint
"""
import requests
import json

def test_order_update():
    # API endpoint
    base_url = "http://localhost:8000/api/v1"
    
    # First, let's get the kitchen orders to find an order to update
    print("🔍 Getting kitchen orders...")
    
    try:
        # You'll need to get a valid auth token first
        # For now, let's try without auth to see what happens
        response = requests.get(f"{base_url}/orders/kitchen")
        print(f"Kitchen orders response status: {response.status_code}")
        
        if response.status_code == 401:
            print("❌ Authentication required. Need to login first.")
            return
        elif response.status_code == 200:
            orders = response.json()
            print(f"📋 Found {len(orders)} orders")
            
            if orders:
                # Try to update the first order
                test_order = orders[0]
                order_id = test_order['id']
                current_status = test_order['status']
                
                print(f"\n🧪 Testing update on order {test_order['order_number']}")
                print(f"Current status: {current_status}")
                
                # Determine new status
                if current_status == 'confirmed':
                    new_status = 'preparing'
                elif current_status == 'preparing':
                    new_status = 'ready'
                else:
                    new_status = 'confirmed'
                
                print(f"Attempting to change to: {new_status}")
                
                # Make the update request
                update_data = {"status": new_status}
                update_response = requests.patch(
                    f"{base_url}/orders/{order_id}/status",
                    json=update_data
                )
                
                print(f"Update response status: {update_response.status_code}")
                print(f"Update response body: {update_response.text}")
                
                if update_response.status_code == 200:
                    print("✅ Update successful!")
                else:
                    print(f"❌ Update failed with status {update_response.status_code}")
            else:
                print("No orders found to test with")
        else:
            print(f"❌ Failed to get kitchen orders: {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")

if __name__ == "__main__":
    test_order_update()