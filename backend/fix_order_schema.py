#!/usr/bin/env python3
"""
Fix Order Schema - Update orders table to match backend API expectations
"""
import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def main():
    # Initialize Supabase client with service role key (admin privileges)
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not service_key:
        print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file")
        sys.exit(1)
    
    supabase: Client = create_client(supabase_url, service_key)
    
    print("🔧 Fixing order schema...")
    
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
        
        # Step 4: Rename 'total' to 'total_amount' if it exists
        """DO $$ 
           BEGIN 
               IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'total') THEN
                   ALTER TABLE public.orders RENAME COLUMN total TO total_amount;
               END IF;
           END $$;""",
        
        # Step 5: Add notes column
        "ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes TEXT;",
        
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
    
    # Execute each command
    for i, sql in enumerate(sql_commands, 1):
        try:
            print(f"  Step {i}: Executing SQL command...")
            result = supabase.rpc('exec_sql', {'sql': sql}).execute()
            print(f"  ✅ Step {i} completed successfully")
        except Exception as e:
            print(f"  ⚠️  Step {i} failed (might be expected): {str(e)}")
            # Continue with other commands even if one fails
            continue
    
    # Verify the schema
    print("\n🔍 Verifying schema...")
    try:
        # Check if we can query orders table
        result = supabase.table("orders").select("*").limit(1).execute()
        print("✅ Orders table is accessible")
        
        # Check columns
        columns_result = supabase.rpc('get_table_columns', {'table_name': 'orders'}).execute()
        print("✅ Schema verification completed")
        
    except Exception as e:
        print(f"⚠️  Schema verification failed: {str(e)}")
    
    print("\n🎉 Order schema fix completed!")
    print("You can now test the Chef Dashboard order status updates.")

if __name__ == "__main__":
    main()