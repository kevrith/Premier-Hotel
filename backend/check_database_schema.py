"""
Check current database schema
Verifies what tables and columns exist in Supabase
"""
import requests
import os
import sys

# Supabase REST API details
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://njhjpxfozgpoiqwksple.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_KEY:
    print("❌ ERROR: SUPABASE_KEY environment variable not set")
    sys.exit(1)

def check_table_exists(table_name):
    """Check if a table exists by trying to query it"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }

    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/{table_name}",
            headers=headers,
            params={"limit": 1}
        )
        return response.status_code == 200
    except:
        return False

def main():
    print("🔍 Checking Supabase Database Schema\n")
    print("="*70)

    tables_to_check = [
        "users",
        "orders",
        "bills",
        "bill_orders",
        "payments",
        "menu_items",
        "bookings",
        "rooms"
    ]

    print("\n📊 Table Existence Check:")
    print("-"*70)

    for table in tables_to_check:
        exists = check_table_exists(table)
        status = "✅ EXISTS" if exists else "❌ NOT FOUND"
        print(f"{table:20} {status}")

    print("\n" + "="*70)

    # Check if orders table has our new columns
    print("\n🔍 Checking orders table for bill-related columns...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }

    try:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/orders",
            headers=headers,
            params={"limit": 1}
        )

        if response.status_code == 200:
            data = response.json()
            if data:
                columns = list(data[0].keys())
                print(f"\n✅ Orders table columns ({len(columns)} total):")

                # Check for our specific columns
                required_cols = ["payment_status", "bill_id", "paid_at"]
                for col in required_cols:
                    exists = col in columns
                    status = "✅" if exists else "❌"
                    print(f"   {status} {col}")

                print(f"\n📋 All columns: {', '.join(sorted(columns))}")
            else:
                print("⚠️  Orders table exists but has no data")
        else:
            print(f"❌ Cannot access orders table: {response.status_code}")
    except Exception as e:
        print(f"❌ Error checking orders columns: {e}")

    print("\n" + "="*70)

if __name__ == "__main__":
    main()
