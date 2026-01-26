#!/usr/bin/env python3
"""
Check and clean up orders in the database
"""
import asyncio
import os
from supabase import create_client, Client
from datetime import datetime, timedelta

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

async def main():
    # Initialize Supabase client
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("🔍 Checking orders in database...")
    
    # Get all orders
    response = supabase.table("orders").select("*").order("created_at", desc=True).execute()
    orders = response.data
    
    print(f"📊 Total orders in database: {len(orders)}")
    
    # Group by status
    status_counts = {}
    for order in orders:
        status = order.get('status', 'unknown')
        status_counts[status] = status_counts.get(status, 0) + 1
    
    print("\n📈 Orders by status:")
    for status, count in status_counts.items():
        print(f"  {status}: {count}")
    
    # Show recent orders
    print(f"\n📋 Recent orders (last 10):")
    for i, order in enumerate(orders[:10]):
        created_at = order.get('created_at', 'unknown')
        order_number = order.get('order_number', 'N/A')
        status = order.get('status', 'unknown')
        location = order.get('location', 'N/A')
        total = order.get('total_amount', 0)
        
        print(f"  {i+1}. {order_number} | {status} | {location} | KES {total} | {created_at}")
    
    # Check for old test orders
    cutoff_date = datetime.now() - timedelta(days=7)
    old_orders = [o for o in orders if o.get('created_at') and datetime.fromisoformat(o['created_at'].replace('Z', '+00:00')) < cutoff_date]
    
    if old_orders:
        print(f"\n🗑️  Found {len(old_orders)} orders older than 7 days")
        cleanup = input("Do you want to delete old test orders? (y/N): ").lower().strip()
        
        if cleanup == 'y':
            print("🧹 Cleaning up old orders...")
            for order in old_orders:
                try:
                    supabase.table("orders").delete().eq("id", order["id"]).execute()
                    print(f"  ✅ Deleted order {order.get('order_number', order['id'])}")
                except Exception as e:
                    print(f"  ❌ Failed to delete order {order.get('order_number', order['id'])}: {e}")
            
            print(f"✅ Cleanup completed!")
        else:
            print("Skipping cleanup.")
    
    # Check for orders in 'preparing' status
    preparing_orders = [o for o in orders if o.get('status') == 'preparing']
    if preparing_orders:
        print(f"\n👨‍🍳 Found {len(preparing_orders)} orders in 'preparing' status:")
        for order in preparing_orders:
            print(f"  - {order.get('order_number')} at {order.get('location')} (created: {order.get('created_at')})")
        
        reset_preparing = input("Do you want to reset 'preparing' orders to 'pending'? (y/N): ").lower().strip()
        
        if reset_preparing == 'y':
            print("🔄 Resetting preparing orders...")
            for order in preparing_orders:
                try:
                    supabase.table("orders").update({
                        "status": "pending",
                        "assigned_chef_id": None,
                        "preparing_started_at": None
                    }).eq("id", order["id"]).execute()
                    print(f"  ✅ Reset order {order.get('order_number')} to pending")
                except Exception as e:
                    print(f"  ❌ Failed to reset order {order.get('order_number')}: {e}")
            
            print("✅ Reset completed!")
        else:
            print("Keeping orders as-is.")
    
    print("\n✅ Database check completed!")

if __name__ == "__main__":
    asyncio.run(main())