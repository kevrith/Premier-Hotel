#!/usr/bin/env python3
"""
Disable Row Level Security on inventory tables for testing
"""
import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env file")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def disable_inventory_rls():
    """Disable RLS on inventory tables"""
    print("=" * 60)
    print("🔓 Disabling RLS on Inventory Tables")
    print("=" * 60)
    print()
    print("⚠️  SECURITY WARNING: This will make inventory data publicly accessible!")
    print("Only use this for development/testing!")
    print()

    inventory_tables = [
        'suppliers',
        'inventory_categories',
        'inventory_items',
        'stock_movements',
        'purchase_orders',
        'purchase_order_items',
        'stock_alerts',
        'inventory_batches',
        'stock_takes',
        'stock_take_items'
    ]

    try:
        for table in inventory_tables:
            print(f"Disabling RLS on {table}...")
            # Execute raw SQL to disable RLS
            result = supabase.rpc('exec_sql', {
                'sql': f'ALTER TABLE public.{table} DISABLE ROW LEVEL SECURITY;'
            })

            if result.status_code == 200:
                print(f"✅ RLS disabled on {table}")
            else:
                print(f"❌ Failed to disable RLS on {table}: {result}")

        print()
        print("🎉 All inventory tables RLS disabled!")
        print("⚠️  Remember to re-enable RLS before production deployment")

    except Exception as e:
        print(f"❌ Error disabling RLS: {e}")

if __name__ == "__main__":
    disable_inventory_rls()
