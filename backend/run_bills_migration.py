"""
Run Bills and Payments Migration
Executes the 006_create_bills_and_payments.sql migration
"""
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Supabase connection details
DB_CONFIG = {
    "host": "aws-0-eu-central-1.pooler.supabase.com",
    "port": 6543,
    "database": "postgres",
    "user": "postgres.kgkafgrdczbfktzzqrfu",
    "password": "BlessedKelvin254."
}

def run_migration():
    """Execute the bills and payments migration"""
    try:
        # Connect to database
        print("🔌 Connecting to Supabase database...")
        conn = psycopg2.connect(**DB_CONFIG)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("✅ Connected successfully!\n")

        # Read migration file
        print("📖 Reading migration SQL...")
        with open('sql/migrations/006_create_bills_and_payments.sql', 'r') as f:
            migration_sql = f.read()

        print("✅ Migration file loaded\n")

        # Execute migration
        print("🚀 Executing migration...")
        print("="*70)

        cursor.execute(migration_sql)

        print("\n✅ Migration executed successfully!")

        # Verify tables were created
        print("\n🔍 Verifying tables...")
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('bills', 'bill_orders', 'payments')
            ORDER BY table_name
        """)

        tables = cursor.fetchall()
        if tables:
            print("✅ Tables created:")
            for table in tables:
                print(f"   - {table[0]}")
        else:
            print("⚠️  No tables found (they may already exist)")

        # Check if payment_status column was added to orders
        print("\n🔍 Verifying orders table updates...")
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'orders'
            AND column_name IN ('payment_status', 'bill_id', 'paid_at')
            ORDER BY column_name
        """)

        columns = cursor.fetchall()
        if columns:
            print("✅ Columns added to orders table:")
            for col in columns:
                print(f"   - {col[0]}")

        cursor.close()
        conn.close()

        print("\n" + "="*70)
        print("✅ Bills and Payments system is ready!")
        print("="*70)

    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"   Code: {e.pgcode}")
        print(f"   Details: {e.pgerror}")
        return False
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        return False

    return True

if __name__ == "__main__":
    print("\n🔧 Bills and Payments Migration")
    print("="*70 + "\n")

    success = run_migration()

    if success:
        print("\n✨ Next steps:")
        print("   1. Test the bills API endpoints")
        print("   2. Create orders without payment")
        print("   3. Generate bills from unpaid orders")
        print("   4. Process payments against bills")
    else:
        print("\n⚠️  Migration failed. Please check the errors above.")
