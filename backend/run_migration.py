#!/usr/bin/env python3
"""
Execute QuickBooks SQL migration
"""
import asyncpg
import asyncio
import os
import sys

async def run_migration():
    # Database connection
    DATABASE_URL = "postgresql://postgres:password@db.njhjpxfozgpoiqwksple.supabase.co:5432/postgres"

    print("=" * 70)
    print("QuickBooks POS 2013 Integration - Database Migration")
    print("=" * 70)
    print()

    # Read SQL file
    sql_file_path = "sql/create_quickbooks_sync_tables.sql"

    try:
        with open(sql_file_path, 'r') as f:
            sql_content = f.read()

        print(f"✓ Read migration file: {sql_file_path}")
        print(f"  Size: {len(sql_content)} bytes")
        print()

        # Connect to database
        print("Connecting to Supabase database...")
        conn = await asyncpg.connect(DATABASE_URL)
        print("✓ Connected successfully")
        print()

        # Execute migration
        print("Executing migration...")
        await conn.execute(sql_content)
        print("✓ Migration executed successfully")
        print()

        # Verify tables created
        print("Verifying tables...")
        tables = await conn.fetch("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE 'quickbooks%'
            ORDER BY table_name
        """)

        if tables:
            print(f"✓ Created {len(tables)} tables:")
            for table in tables:
                # Get row count
                count = await conn.fetchval(f"SELECT COUNT(*) FROM {table['table_name']}")
                print(f"  - {table['table_name']:<35} ({count} rows)")
        else:
            print("✗ No QuickBooks tables found!")
            sys.exit(1)

        await conn.close()

        print()
        print("=" * 70)
        print("✓ Migration completed successfully!")
        print("=" * 70)

    except FileNotFoundError:
        print(f"✗ Error: SQL file not found: {sql_file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_migration())
