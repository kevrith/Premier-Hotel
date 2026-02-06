#!/usr/bin/env python3
"""Run permissions migration"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.supabase import get_supabase_admin

def run_migration():
    """Add permissions column to users table"""
    supabase = get_supabase_admin()
    
    # Read migration SQL
    with open('migrations/add_permissions_to_users.sql', 'r') as f:
        sql = f.read()
    
    try:
        # Execute migration using raw SQL
        result = supabase.rpc('exec_sql', {'sql': sql}).execute()
        print("✅ Migration completed successfully!")
        print(f"Result: {result}")
    except Exception as e:
        # Try alternative approach - update via API
        print(f"Direct SQL failed: {e}")
        print("Attempting to verify column exists...")
        
        # Test if column exists by querying
        try:
            test = supabase.table('users').select('id, permissions').limit(1).execute()
            print("✅ Permissions column already exists!")
            print(f"Sample data: {test.data}")
        except Exception as e2:
            print(f"❌ Column does not exist and migration failed: {e2}")
            print("\nPlease run this SQL manually in Supabase SQL Editor:")
            print(sql)

if __name__ == '__main__':
    run_migration()
