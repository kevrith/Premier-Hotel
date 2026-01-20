#!/usr/bin/env python3
"""
Database Migration via Supabase REST API
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

def run_migration():
    """Execute the database migration via Supabase client"""
    print("=" * 70)
    print("🚀 Premier Hotel - Database Migration (via Supabase API)")
    print("=" * 70)
    print()

    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not supabase_url or not service_key:
        print("❌ ERROR: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env")
        return False

    print(f"📍 Supabase URL: {supabase_url}")
    print()

    # Read migration SQL
    sql_file = Path(__file__).parent / "sql" / "create_auth_tables.sql"

    if not sql_file.exists():
        print(f"❌ ERROR: Migration file not found at {sql_file}")
        return False

    print(f"📄 Reading migration from: {sql_file.name}")

    with open(sql_file, 'r') as f:
        migration_sql = f.read()

    print(f"✅ Loaded {len(migration_sql)} characters of SQL")
    print()

    # Create Supabase client
    print("🔌 Connecting to Supabase...")
    supabase = create_client(supabase_url, service_key)
    print("✅ Connected!")
    print()

    print("=" * 70)
    print("⚠️  SUPABASE API LIMITATION DETECTED")
    print("=" * 70)
    print()
    print("The Supabase REST API does not support direct SQL execution.")
    print("This is a security feature by design.")
    print()
    print("Please run the migration manually using Supabase SQL Editor:")
    print()
    print("📋 STEP-BY-STEP INSTRUCTIONS:")
    print()
    print("1. Open Supabase SQL Editor:")
    print("   https://app.supabase.com/project/njhjpxfozgpoiqwksple/sql")
    print()
    print("2. Click 'New Query' button")
    print()
    print("3. Copy the SQL file contents:")
    print(f"   File: {sql_file}")
    print()
    print("4. Paste into the SQL editor")
    print()
    print("5. Click 'Run' button (or press Ctrl/Cmd + Enter)")
    print()
    print("6. You should see: 'Success. No rows returned'")
    print()
    print("=" * 70)
    print()

    # Verify if tables already exist
    try:
        print("🔍 Checking current database state...")
        
        # Try to query users table
        result = supabase.table('users').select('id').limit(0).execute()
        print("✅ 'users' table exists")
        
        # Check other tables
        tables_to_check = [
            'email_verifications', 'phone_verifications', 'password_resets',
            'refresh_tokens', 'social_auth', 'auth_audit_log', 
            'user_sessions', 'rate_limits'
        ]
        
        existing = []
        missing = []
        
        for table in tables_to_check:
            try:
                supabase.table(table).select('id').limit(0).execute()
                existing.append(table)
            except:
                missing.append(table)
        
        print(f"✅ Found {len(existing) + 1}/{len(tables_to_check) + 1} tables")
        
        if missing:
            print()
            print(f"⚠️  Missing tables ({len(missing)}):")
            for table in missing:
                print(f"   ❌ {table}")
            print()
            print("👉 Please run the migration SQL to create missing tables")
            return False
        else:
            print()
            print("=" * 70)
            print("✅ ALL TABLES EXIST! Migration may have already been run.")
            print("=" * 70)
            return True
            
    except Exception as e:
        print(f"⚠️  Cannot verify tables: {e}")
        print()
        print("👉 Please run the migration SQL manually")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
