#!/usr/bin/env python3
"""
Test Status Constraint - Test what status values are allowed in the database
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
    
    print("🧪 Testing status constraint...")
    
    try:
        # Get an order to test with
        orders_response = supabase.table("orders").select("id, order_number, status").limit(1).execute()
        
        if not orders_response.data:
            print("❌ No orders found to test with")
            return
            
        test_order = orders_response.data[0]
        order_id = test_order['id']
        current_status = test_order['status']
        
        print(f"📋 Testing with order {test_order['order_number']} (current status: {current_status})")
        
        # Test different status values
        test_statuses = ['pending', 'confirmed', 'preparing', 'in-progress', 'ready', 'served', 'delivered', 'completed', 'cancelled']
        
        for test_status in test_statuses:
            if test_status == current_status:
                continue  # Skip current status
                
            print(f"\n🔄 Testing status: '{test_status}'")
            
            try:
                update_response = supabase.table("orders").update({"status": test_status}).eq("id", order_id).execute()
                
                if update_response.data:
                    print(f"✅ '{test_status}' - SUCCESS")
                    # Revert back to original status for next test
                    supabase.table("orders").update({"status": current_status}).eq("id", order_id).execute()
                else:
                    print(f"❌ '{test_status}' - FAILED (no data returned)")
                    
            except Exception as e:
                error_msg = str(e)
                if "check constraint" in error_msg.lower():
                    print(f"❌ '{test_status}' - CONSTRAINT VIOLATION")
                elif "violates check constraint" in error_msg.lower():
                    print(f"❌ '{test_status}' - CONSTRAINT VIOLATION")
                else:
                    print(f"❌ '{test_status}' - ERROR: {error_msg}")
                    
    except Exception as e:
        print(f"❌ Error during test: {str(e)}")

if __name__ == "__main__":
    main()