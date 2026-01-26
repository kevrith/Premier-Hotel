#!/usr/bin/env python3
"""
Simple script to clean up test orders
"""
import os
from supabase import create_client, Client

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

def main():
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Current orders in database:")
    
    # Get all orders
    response = supabase.table("orders").select("*").order("created_at", desc=True).execute()
    orders = response.data
    
    print(f"📊 Total orders: {len(orders)}")
    
    # Group by status
    status_counts = {}
    for order in orders:
        status = order.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\n📈 Orders by status:")
    for status, count in status_counts.items():
        print(f"  {status}: {count}")
    
    # Calculate waiter dashboard counts
    active_orders = len([o for o in orders if o.get('status') in ['pending', 'confirmed', 'preparing']])
    ready_orders = len([o for o in orders if o.get('status') == 'ready'])
    served_orders = len([o for o in orders if o.get('status') == 'served'])
    
    print(f"\n🍽️  Waiter Dashboard counts:")
    print(f"  In Kitchen: {active_orders}")
    print(f"  Ready for Pickup: {ready_orders}")
    print(f"  Awaiting Payment: {served_orders}")
    
    print(f"\n📋 Recent orders:")
    for i, order in enumerate(orders[:10]):
        order_number = order.get('order_number', 'N/A')
        status = order.get('status', 'unknown')
        location = order.get('location', 'N/A')
        total = order.get('total_amount', 0)
        
        print(f"  {i+1}. {order_number} | {status} | {location} | KES {total}")
    
    # Option to clean up
    print(f"\n🗑️  Cleanup options:")
    print("1. Delete all completed orders")
    print("2. Reset all 'confirmed' orders to 'pending'")
    print("3. Delete all orders (DANGER!)")
    print("4. Exit")
    
    choice = input("\nEnter your choice (1-4): ").strip()
    
    if choice == "1":
        completed_orders = [o for o in orders if o.get('status') == 'completed']
        if completed_orders:
            confirm = input(f"Delete {len(completed_orders)} completed orders? (y/N): ").lower()
            if confirm == 'y':
                for order in completed_orders:
                    supabase.table("orders").delete().eq("id", order["id"]).execute()
                    print(f"  ✅ Deleted {order.get('order_number')}")
                print("✅ Completed orders deleted!")
        else:
            print("No completed orders found.")
    
    elif choice == "2":
        confirmed_orders = [o for o in orders if o.get('status') == 'confirmed']
        if confirmed_orders:
            confirm = input(f"Reset {len(confirmed_orders)} confirmed orders to pending? (y/N): ").lower()
            if confirm == 'y':
                for order in confirmed_orders:
                    supabase.table("orders").update({"status": "pending"}).eq("id", order["id"]).execute()
                    print(f"  ✅ Reset {order.get('order_number')} to pending")
                print("✅ Orders reset to pending!")
        else:
            print("No confirmed orders found.")
    
    elif choice == "3":
        confirm = input(f"DELETE ALL {len(orders)} ORDERS? This cannot be undone! (type 'DELETE' to confirm): ")
        if confirm == 'DELETE':
            supabase.table("orders").delete().neq("id", "").execute()
            print("🗑️  All orders deleted!")
        else:
            print("Cancelled.")
    
    elif choice == "4":
        print("Exiting...")
    
    else:
        print("Invalid choice.")

if __name__ == "__main__":
    main()