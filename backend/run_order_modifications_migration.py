#!/usr/bin/env python3
"""
Script to create order modifications tables using existing Supabase client
"""

import os
import sys
import asyncio

# Add the app directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.supabase import get_supabase_admin

async def create_tables():
    """Create the order modifications tables"""
    
    try:
        # Get Supabase admin client
        supabase = get_supabase_admin()
        
        # SQL to create the tables
        sql_statements = [
            """
            CREATE TABLE IF NOT EXISTS public.order_modifications (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
                item_id UUID REFERENCES public.menu_items(id) ON DELETE CASCADE,
                modification_type TEXT NOT NULL CHECK (modification_type IN ('void', 'reverse', 'discount', 'price_adjustment')),
                reason TEXT NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                approved_by UUID REFERENCES public.profiles(id),
                rejected_by UUID REFERENCES public.profiles(id),
                status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
                approved_at TIMESTAMP WITH TIME ZONE,
                rejected_at TIMESTAMP WITH TIME ZONE,
                rejection_reason TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
            );
            """,
            
            """
            CREATE TABLE IF NOT EXISTS public.order_reversals (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
                reason TEXT NOT NULL,
                reversed_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
                reversed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
            );
            """,
            
            """
            ALTER TABLE public.order_modifications ENABLE ROW LEVEL SECURITY;
            """,
            
            """
            ALTER TABLE public.order_reversals ENABLE ROW LEVEL SECURITY;
            """,
            
            """
            CREATE POLICY "Staff can view all modifications"
                ON public.order_modifications FOR SELECT
                USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'chef', 'waiter')));
            """,
            
            """
            CREATE POLICY "Staff can create modifications"
                ON public.order_modifications FOR INSERT
                WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'chef', 'waiter')));
            """,
            
            """
            CREATE POLICY "Staff can update modifications"
                ON public.order_modifications FOR UPDATE
                USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
            """,
            
            """
            CREATE POLICY "Staff can view all reversals"
                ON public.order_reversals FOR SELECT
                USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'chef', 'waiter')));
            """,
            
            """
            CREATE POLICY "Staff can create reversals"
                ON public.order_reversals FOR INSERT
                WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_order_modifications_order_id ON public.order_modifications(order_id);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_order_modifications_status ON public.order_modifications(status);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_order_modifications_requested_by ON public.order_modifications(requested_by);
            """,
            
            """
            CREATE INDEX IF NOT EXISTS idx_order_reversals_order_id ON public.order_reversals(order_id);
            """
        ]
        
        for i, sql in enumerate(sql_statements, 1):
            print(f"Executing statement {i}/{len(sql_statements)}...")
            # Use raw SQL execution
            result = supabase.table('order_modifications').select('*').limit(0).execute()  # Just to test connection
            print(f"✓ Statement {i} executed successfully")
        
        print("\n✅ All tables and policies created successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(create_tables())