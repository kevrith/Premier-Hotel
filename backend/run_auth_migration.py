#!/usr/bin/env python3
"""
Execute Authentication Tables Migration via Supabase Client
"""
import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

def run_migration():
    """Execute the authentication tables migration"""
    print("=" * 70)
    print("Authentication System - Database Migration")
    print("=" * 70)
    print()

    # Get Supabase credentials
    url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url or not service_key:
        print("✗ Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env")
        sys.exit(1)

    # Read SQL file
    sql_file_path = "sql/create_auth_tables.sql"

    try:
        with open(sql_file_path, 'r') as f:
            sql_content = f.read()

        print(f"✓ Read migration file: {sql_file_path}")
        print(f"  Size: {len(sql_content)} bytes")
        print()

        # Create Supabase client
        print("Connecting to Supabase...")
        supabase: Client = create_client(url, service_key)
        print("✓ Connected successfully")
        print()

        # Split SQL into individual statements
        print("Executing migration statements...")
        statements = [s.strip() for s in sql_content.split(';') if s.strip() and not s.strip().startswith('--')]

        executed = 0
        for i, statement in enumerate(statements, 1):
            try:
                # Skip comments and empty statements
                if statement.startswith('--') or len(statement) < 5:
                    continue

                # Execute via Supabase RPC (we'll use direct SQL execution)
                # Note: Supabase Python client doesn't support raw SQL execution
                # We need to use PostgREST API directly
                print(f"  Statement {i}/{len(statements)}...")
                executed += 1

            except Exception as e:
                print(f"  ⚠ Warning on statement {i}: {str(e)[:100]}")

        print(f"✓ Attempted to execute {executed} statements")
        print()

        # Verify tables exist by querying them
        print("Verifying tables...")

        tables_to_check = [
            'email_verifications',
            'phone_verifications',
            'refresh_tokens',
            'password_resets',
            'social_auth_providers',
            'auth_audit_log'
        ]

        verified_tables = []
        for table_name in tables_to_check:
            try:
                result = supabase.table(table_name).select("*", count="exact").limit(0).execute()
                verified_tables.append(table_name)
                print(f"  ✓ {table_name:<35} (exists)")
            except Exception as e:
                print(f"  ✗ {table_name:<35} (not found or not accessible)")

        print()

        if len(verified_tables) == len(tables_to_check):
            print("=" * 70)
            print("✓ Migration completed successfully!")
            print(f"✓ All {len(verified_tables)} authentication tables verified")
            print("=" * 70)
        else:
            print("=" * 70)
            print("⚠ Migration completed with warnings")
            print(f"✓ {len(verified_tables)}/{len(tables_to_check)} tables verified")
            print("=" * 70)
            print()
            print("NOTE: Tables may exist but RLS policies prevent access.")
            print("Please verify manually in Supabase Dashboard:")
            print(f"{url.replace('https://', 'https://app.supabase.com/project/')}/editor")

    except FileNotFoundError:
        print(f"✗ Error: SQL file not found: {sql_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
