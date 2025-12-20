#!/usr/bin/env python3
"""
Check if QuickBooks tables exist in Supabase database
"""

import os
import asyncpg
import asyncio

# Read Supabase credentials from environment
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db.njhjpxfozgpoiqwksple.supabase.co:5432/postgres")

print("=" * 70)
print("Checking QuickBooks Tables in Supabase")
print("=" * 70)
print()

# Check for QuickBooks tables
quickbooks_tables = [
    "quickbooks_config",
    "quickbooks_sync_log",
    "quickbooks_item_mapping",
    "quickbooks_customer_mapping"
]

async def check_tables():
    print("Checking for QuickBooks tables...")
    print()

    conn = await asyncpg.connect(DATABASE_URL)

    try:
        for table_name in quickbooks_tables:
            try:
                # Check if table exists
                result = await conn.fetchval(
                    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
                    table_name
                )
                if result:
                    # Get row count
                    count = await conn.fetchval(f"SELECT COUNT(*) FROM {table_name}")
                    print(f"✓ {table_name:<35} EXISTS (rows: {count})")
                else:
                    print(f"✗ {table_name:<35} NOT FOUND")
            except Exception as e:
                error_msg = str(e)
                print(f"? {table_name:<35} ERROR: {error_msg[:50]}")
    finally:
        await conn.close()

# Run the async function
asyncio.run(check_tables())

print()
print("=" * 70)
print("Next Steps:")
print("=" * 70)
print()
print("If tables are NOT FOUND, run the SQL migration:")
print("  ./deploy-quickbooks.sh")
print()
print("Or manually execute:")
print("  backend/sql/create_quickbooks_sync_tables.sql")
print()
