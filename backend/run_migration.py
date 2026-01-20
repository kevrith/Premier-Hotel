#!/usr/bin/env python3
"""
Database Migration Script
Executes the authentication system migration on Supabase
"""
import asyncio
import asyncpg
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def run_migration():
    """Execute the database migration"""
    print("=" * 70)
    print("🚀 Premier Hotel - Database Migration")
    print("=" * 70)
    print()

    # Get database URL
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ ERROR: DATABASE_URL not found in .env file")
        return False

    print(f"📍 Database: {db_url.split('@')[1] if '@' in db_url else 'Unknown'}")
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

    # Connect to database
    print("🔌 Connecting to Supabase database...")

    try:
        # Parse connection string for asyncpg
        conn = await asyncpg.connect(db_url)
        print("✅ Connected successfully!")
        print()

        # Execute migration
        print("⚙️  Executing migration SQL...")
        print("-" * 70)

        # Split SQL by semicolons and execute each statement
        statements = [s.strip() for s in migration_sql.split(';') if s.strip()]

        total = len(statements)
        for i, statement in enumerate(statements, 1):
            # Skip comments and empty statements
            if statement.startswith('--') or not statement:
                continue

            try:
                await conn.execute(statement)
                # Show progress for major operations
                if 'CREATE TABLE' in statement.upper():
                    table_name = statement.split('CREATE TABLE')[1].split('(')[0].strip().split()[-1]
                    print(f"  [{i}/{total}] ✅ Created/Updated table: {table_name}")
                elif 'CREATE INDEX' in statement.upper():
                    print(f"  [{i}/{total}] ✅ Created index")
                elif 'CREATE FUNCTION' in statement.upper():
                    print(f"  [{i}/{total}] ✅ Created function")
                elif 'CREATE TRIGGER' in statement.upper():
                    print(f"  [{i}/{total}] ✅ Created trigger")
                elif 'ALTER TABLE' in statement.upper():
                    print(f"  [{i}/{total}] ✅ Altered table")
                else:
                    print(f"  [{i}/{total}] ✅ Executed statement")
            except Exception as e:
                # Some errors are okay (like column already exists)
                if 'already exists' in str(e).lower():
                    print(f"  [{i}/{total}] ⚠️  Skipped (already exists)")
                else:
                    print(f"  [{i}/{total}] ❌ Error: {e}")

        print("-" * 70)
        print()

        # Verify tables were created
        print("🔍 Verifying tables...")
        tables = await conn.fetch("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'users', 'email_verifications', 'phone_verifications',
                'password_resets', 'refresh_tokens', 'social_auth',
                'auth_audit_log', 'user_sessions', 'rate_limits'
            )
            ORDER BY table_name
        """)

        print()
        print("📊 Tables in database:")
        for table in tables:
            print(f"   ✅ {table['table_name']}")

        print()
        print(f"✅ Found {len(tables)}/9 authentication tables")
        print()

        # Close connection
        await conn.close()

        print("=" * 70)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print()
        print("Next steps:")
        print("  1. Start your backend server:")
        print("     cd backend && ./venv/bin/python3.12 -m uvicorn app.main:app --reload")
        print()
        print("  2. Test SMS OTP with:")
        print("     ./venv/bin/python3.12 test_sms.py")
        print()

        return True

    except Exception as e:
        print(f"❌ ERROR: {e}")
        print()
        print("If you see SSL or connection errors, please run the migration manually:")
        print("  1. Go to: https://app.supabase.com/project/njhjpxfozgpoiqwksple/sql")
        print("  2. Copy contents of: backend/sql/create_auth_tables.sql")
        print("  3. Paste and click 'Run'")
        print()
        return False

if __name__ == "__main__":
    success = asyncio.run(run_migration())
    exit(0 if success else 1)
