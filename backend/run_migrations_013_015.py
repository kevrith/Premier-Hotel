#!/usr/bin/env python3
"""
Run SQL migrations 013 and 015 using direct PostgreSQL connection
"""
import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ Error: DATABASE_URL must be set in .env")
    sys.exit(1)

def run_sql_file(file_path: str, cursor) -> bool:
    """Run a SQL file"""
    try:
        print(f"\n{'='*60}")
        print(f"Running: {file_path}")
        print(f"{'='*60}")

        # Read SQL file
        sql_content = Path(file_path).read_text()

        # Execute SQL
        cursor.execute(sql_content)

        print(f"✅ Successfully executed {file_path}")

        # Get any output (like from SELECT statements)
        if cursor.description:
            results = cursor.fetchall()
            if results:
                print("\nOutput:")
                for row in results:
                    print(f"  {row}")

        return True

    except Exception as e:
        print(f"❌ Error executing {file_path}:")
        print(f"   {str(e)}")
        return False

def main():
    """Run migrations 013 and 015"""
    migrations_dir = Path(__file__).parent / "sql" / "migrations"

    migrations = [
        migrations_dir / "013_add_performance_indexes.sql",
        migrations_dir / "015_add_foreign_key_constraints.sql"
    ]

    print("\n" + "="*60)
    print("PREMIER HOTEL - SQL MIGRATIONS 013 & 015")
    print("="*60)
    print(f"Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else '***'}")

    # Connect to database
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False  # Use transactions
        cursor = conn.cursor()

        success_count = 0
        failed_count = 0

        for migration_file in migrations:
            if not migration_file.exists():
                print(f"❌ File not found: {migration_file}")
                failed_count += 1
                continue

            if run_sql_file(str(migration_file), cursor):
                # Commit after each successful migration
                conn.commit()
                print("✅ Migration committed")
                success_count += 1
            else:
                # Rollback on error
                conn.rollback()
                print("⚠️  Migration rolled back")
                failed_count += 1

        cursor.close()
        conn.close()

        print("\n" + "="*60)
        print(f"SUMMARY: {success_count} succeeded, {failed_count} failed")
        print("="*60 + "\n")

        return 0 if failed_count == 0 else 1

    except Exception as e:
        print(f"\n❌ Database connection error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
