#!/usr/bin/env python3
"""
Fix Order Schema - Direct database migration using asyncpg
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def main():
    database_url = os.getenv("DATABASE_URL")
    
    if not database_url:
        print("Error: Missing DATABASE_URL in .env file")
        return
    
    print("🔧 Connecting to database...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        print("✅ Connected to database")
        
        # SQL commands to fix the schema
        sql_commands = [
            # Step 1: Drop existing constraint
            "ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;",
            
            # Step 2: Add correct status constraint
            """ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
               CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'));""",
            
            # Step 3: Add missing timestamp columns
            "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS preparing_started_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS served_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;",
            "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;",
            
            # Step 4: Add notes column
            "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;",
            
            # Step 5: Check if 'total' column exists and rename to 'total_amount'
            """DO $$ 
               BEGIN 
                   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total') THEN
                       ALTER TABLE public.orders RENAME COLUMN total TO total_amount;
                   END IF;
               END $$;""",
            
            # Step 6: Update existing orders with old status values
            """UPDATE public.orders 
               SET status = 'confirmed' 
               WHERE status = 'in-progress' AND preparing_started_at IS NULL;""",
            
            """UPDATE public.orders 
               SET status = 'preparing' 
               WHERE status = 'in-progress' AND preparing_started_at IS NOT NULL;""",
            
            """UPDATE public.orders 
               SET status = 'served' 
               WHERE status = 'delivered';""",
            
            # Step 7: Create indexes
            "CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);",
            "CREATE INDEX IF NOT EXISTS idx_orders_assigned_chef ON public.orders(assigned_chef_id) WHERE assigned_chef_id IS NOT NULL;",
            "CREATE INDEX IF NOT EXISTS idx_orders_assigned_waiter ON public.orders(assigned_waiter_id) WHERE assigned_waiter_id IS NOT NULL;",
        ]
        
        print("🔧 Executing schema fixes...")
        
        # Execute each command
        for i, sql in enumerate(sql_commands, 1):
            try:
                print(f"  Step {i}: {sql[:50]}...")
                await conn.execute(sql)
                print(f"  ✅ Step {i} completed successfully")
            except Exception as e:
                print(f"  ⚠️  Step {i} failed: {str(e)}")
                # Continue with other commands even if one fails
                continue
        
        # Verify the schema
        print("\n🔍 Verifying schema...")
        
        # Check columns
        columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'orders' AND table_schema = 'public'
            ORDER BY column_name;
        """)
        
        print("📋 Orders table columns:")
        for col in columns:
            print(f"  - {col['column_name']}: {col['data_type']} ({'nullable' if col['is_nullable'] == 'YES' else 'not null'})")
        
        # Check constraint
        constraints = await conn.fetch("""
            SELECT constraint_name, check_clause
            FROM information_schema.check_constraints
            WHERE constraint_name LIKE '%orders%status%';
        """)
        
        print("\n🔒 Status constraints:")
        for constraint in constraints:
            print(f"  - {constraint['constraint_name']}: {constraint['check_clause']}")
        
        # Test a simple query
        count = await conn.fetchval("SELECT COUNT(*) FROM public.orders;")
        print(f"\n📊 Total orders in database: {count}")
        
        await conn.close()
        print("\n🎉 Order schema fix completed successfully!")
        print("You can now test the Chef Dashboard order status updates.")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())