#!/usr/bin/env python3
"""Quick script to check orders and bills in the database"""
import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

async def check_orders():
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")
    )
    
    print("=" * 60)
    print("CHECKING ORDERS AND BILLS")
    print("=" * 60)
    
    # Get today's orders
    today = datetime.now().date()
    print(f"\n📅 Checking orders for: {today}")
    
    # Get all orders from today
    response = supabase.table("orders").select("*").gte(
        "created_at", f"{today}T00:00:00"
    ).order("created_at", desc=True).execute()
    
    if response.data:
        print(f"\n✅ Found {len(response.data)} orders today:")
        for order in response.data:
            status = order.get('status', 'unknown')
            total = order.get('total_amount', 0)
            created = order.get('created_at', '')[:19]
            order_id = order.get('id', '')[:8]
            print(f"  • Order {order_id}... | {status:12} | KES {total:8.2f} | {created}")
    else:
        print("\n❌ No orders found today")
    
    # Get yesterday's orders
    yesterday = today - timedelta(days=1)
    print(f"\n📅 Checking orders for: {yesterday}")
    
    response = supabase.table("orders").select("*").gte(
        "created_at", f"{yesterday}T00:00:00"
    ).lt("created_at", f"{today}T00:00:00").order("created_at", desc=True).execute()
    
    if response.data:
        print(f"\n✅ Found {len(response.data)} orders yesterday:")
        for order in response.data:
            status = order.get('status', 'unknown')
            total = order.get('total_amount', 0)
            created = order.get('created_at', '')[:19]
            order_id = order.get('id', '')[:8]
            print(f"  • Order {order_id}... | {status:12} | KES {total:8.2f} | {created}")
    else:
        print("\n❌ No orders found yesterday")
    
    # Check unpaid bills
    print(f"\n💰 Checking unpaid orders...")
    response = supabase.table("orders").select("*").eq(
        "payment_status", "pending"
    ).order("created_at", desc=True).limit(10).execute()
    
    if response.data:
        print(f"\n⚠️  Found {len(response.data)} unpaid orders:")
        for order in response.data:
            status = order.get('status', 'unknown')
            total = order.get('total_amount', 0)
            created = order.get('created_at', '')[:19]
            order_id = order.get('id', '')[:8]
            print(f"  • Order {order_id}... | {status:12} | KES {total:8.2f} | {created}")
    else:
        print("\n✅ No unpaid orders found")
    
    # Total statistics
    print(f"\n📊 OVERALL STATISTICS")
    print("=" * 60)
    
    # Total orders
    response = supabase.table("orders").select("id", count="exact").execute()
    print(f"Total orders in database: {response.count}")
    
    # Total paid
    response = supabase.table("orders").select("id", count="exact").eq("payment_status", "paid").execute()
    print(f"Total paid orders: {response.count}")
    
    # Total pending
    response = supabase.table("orders").select("id", count="exact").eq("payment_status", "pending").execute()
    print(f"Total pending orders: {response.count}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(check_orders())
