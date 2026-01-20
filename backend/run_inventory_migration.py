#!/usr/bin/env python3
"""
Run Inventory Migration Script
Executes the inventory tables SQL migration
"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment")
    exit(1)

# Read SQL file
with open('sql/migrations/create_inventory_tables.sql', 'r') as f:
    sql_content = f.read()

print("=== Running Inventory Tables Migration ===\n")
print("Reading SQL file...")
print(f"  Size: {len(sql_content)} characters\n")

# Execute via Supabase REST API (query endpoint)
url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"
headers = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json"
}

print("Executing migration...")
print("\n" + "="*60)
print("NOTE: Direct SQL execution via REST API may not be available.")
print("Please run the SQL manually in Supabase Dashboard > SQL Editor")
print("="*60 + "\n")

print("✓ SQL Migration file ready:")
print("  Location: backend/sql/migrations/create_inventory_tables.sql")
print("\n📋 Tables to be created:")
print("  1. inventory_categories")
print("  2. inventory_items")
print("  3. inventory_transactions")
print("  4. menu_inventory_mapping")
print("  5. inventory_alerts")
print("  6. stock_audits")
print("  7. stock_audit_items")
print("\n✓ Script completed. Run the SQL in Supabase SQL Editor to create tables.")
