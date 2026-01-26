#!/usr/bin/env python3
"""
Database Restore Script
Restores hotel data from backup file
"""

import os
import json
import sys
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def restore_database(backup_file):
    """Restore database from backup file"""
    
    if not os.path.exists(backup_file):
        print(f"Error: Backup file {backup_file} not found")
        return False
    
    # Connect to Supabase
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    supabase = create_client(url, key)
    
    print(f"Restoring from: {backup_file}")
    
    # Load backup data
    with open(backup_file, 'r') as f:
        backup_data = json.load(f)
    
    # Restore each table
    for table, data in backup_data.items():
        if not data:
            print(f"⚠ Skipping empty table: {table}")
            continue
            
        try:
            # Clear existing data (optional - comment out to append)
            # supabase.table(table).delete().neq('id', '').execute()
            
            # Insert backup data
            if data:
                supabase.table(table).insert(data).execute()
                print(f"✓ Restored {table}: {len(data)} records")
        except Exception as e:
            print(f"✗ Error restoring {table}: {e}")
    
    print("✓ Restore completed")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python restore_database.py <backup_file.json>")
        sys.exit(1)
    
    backup_file = sys.argv[1]
    restore_database(backup_file)