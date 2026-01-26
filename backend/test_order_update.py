#!/usr/bin/env python3
"""
Test Order Update - Debug the database schema and order update issue
"""
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    # Initialize Supabase client with service role key (admin privileges)
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")
        sys.exit(1)
    
    supabase: Client = create_client(supabase_url, service_key)
    
    print("🔍 Testing order update functionality...")
    
    # First, let's check what orders exist
    try:
        orders_response = supabase.table("orders").select("id, order_number, status").limit(5).execute()
        print(f"📋 Found {len(orders_response.data)} orders:")
        for order in orders_response.data:
            print(f"  - {order['order_number']}: {order['status']} (ID: {order['id'][:8]}...)")
        
        if not orders_response.data:
            print("❌ No orders found in database")
            return
            
        # Try to update the first order
        test_order = orders_response.data[0]
        order_id = test_order['id']
        current_status = test_order['status']
        
        print(f"\n🧪 Testing update on order {test_order['order_number']} (current status: {current_status})")
        
        # Try different status transitions
        if current_status == 'pending':
            new_status = 'confirmed'
        elif current_status == 'confirmed':
            new_status = 'preparing'
        elif current_status == 'preparing':
            new_status = 'ready'
        else:
            new_status = 'confirmed'  # Reset to confirmed for testing
        
        print(f"🔄 Attempting to change status from '{current_status}' to '{new_status}'")
        
        # Try the update
        update_data = {"status": new_status}
        update_response = supabase.table("orders").update(update_data).eq("id", order_id).execute()
        
        if update_response.data:
            print(f"✅ Update successful! New status: {update_response.data[0]['status']}")
        else:
            print(f"❌ Update failed - no data returned")
            print(f"Response: {update_response}")
            
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        
        # Check if it's a constraint violation
        if "check constraint" in str(e).lower():
            print("🚨 This appears to be a database constraint violation!")
            print("The 'preparing' status is not allowed by the current database schema.")
            print("You need to run the SQL fix in Supabase dashboard.")
        
    # Let's also check the current constraint
    print(f"\n🔒 Checking current database constraints...")
    try:
        # This might not work with Supabase client, but let's try
        constraint_response = supabase.rpc('get_constraints').execute()
        print(f"Constraints: {constraint_response}")
    except Exception as e:
        print(f"Could not fetch constraints: {str(e)}")

if __name__ == "__main__":
    main()