#!/usr/bin/env python3
"""
Run migration to add customer order fields to orders table
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from supabase import create_client

def main():
    """Run the migration"""
    print("🔄 Running customer order fields migration...")

    # Read the migration SQL
    migration_file = 'sql/migrations/005_add_customer_order_fields.sql'
    with open(migration_file, 'r') as f:
        migration_sql = f.read()

    # Connect to Supabase
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Split into individual statements and execute
    statements = [s.strip() for s in migration_sql.split(';') if s.strip() and not s.strip().startswith('--')]

    print(f"\n📝 Executing {len(statements)} SQL statements...\n")

    for i, statement in enumerate(statements, 1):
        # Skip comments and empty lines
        if not statement or statement.startswith('--') or statement.startswith('/*'):
            continue

        try:
            # For ALTER TABLE and CREATE INDEX, we'll use raw SQL execution
            # Note: Supabase client doesn't directly support DDL, so we'll print instructions
            print(f"Statement {i}:")
            if 'ALTER TABLE' in statement:
                print(f"  ✓ ALTER TABLE detected")
            elif 'CREATE INDEX' in statement:
                print(f"  ✓ CREATE INDEX detected")
            elif 'COMMENT' in statement:
                print(f"  ✓ COMMENT detected")
            print()
        except Exception as e:
            print(f"  ❌ Error: {e}\n")

    print("\n" + "="*60)
    print("⚠️  IMPORTANT: Direct DDL execution requires SQL Editor")
    print("="*60)
    print("\nPlease execute this SQL in your Supabase SQL Editor:")
    print("\n1. Go to: https://supabase.com/dashboard")
    print("2. Select your project")
    print("3. Go to SQL Editor")
    print("4. Copy and paste the SQL below:")
    print("\n" + "="*60 + "\n")
    print(migration_sql)
    print("\n" + "="*60)
    print("\n✅ Or run this command if you have psql:")
    print(f"\n   cat {migration_file} | psql YOUR_DATABASE_URL\n")

if __name__ == "__main__":
    main()
