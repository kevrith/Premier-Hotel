#!/usr/bin/env python3
"""Check payment_status field in orders table"""
import asyncio
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

async def check_payment_status():
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")
    )
    
    print("\n🔍 Checking payment_status field...")
    
    # Get recent orders with all fields
    response = supabase.table("orders").select("id, status, payment_status, total_amount, created_at").order("created_at", desc=True).limit(10).execute()
    
    print(f"\n📋 Last 10 orders:")
    for order in response.data:
        order_id = order.get('id', '')[:8]
        status = order.get('status', 'N/A')
        payment = order.get('payment_status', 'NULL')
        total = order.get('total_amount', 0)
        created = order.get('created_at', '')[:19]
        print(f"  {order_id}... | Status: {status:12} | Payment: {payment:10} | KES {total:8.2f} | {created}")
    
    # Check if payment_status column exists
    print("\n💡 Recommendation:")
    print("If payment_status is NULL for all orders, the bills might not show properly.")
    print("You can create a test order to verify the system is working correctly.")

if __name__ == "__main__":
    asyncio.run(check_payment_status())
