#!/usr/bin/env python3
"""
Database Backup Script
Creates a backup of all hotel data
"""

import os
import json
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def backup_database():
    """Create a complete database backup"""
    
    # Connect to Supabase
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY')
    supabase = create_client(url, key)
    
    # Create backup filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"backup_{timestamp}.json"
    
    print(f"Creating backup: {backup_file}")
    
    # Tables to backup
    tables = [
        'users', 'profiles', 'orders', 'menu_items', 'bookings', 
        'payments', 'rooms', 'staff', 'notifications', 'reviews'
    ]
    
    backup_data = {}
    
    # Backup each table
    for table in tables:
        try:
            response = supabase.table(table).select("*").execute()
            backup_data[table] = response.data
            print(f"✓ Backed up {table}: {len(response.data)} records")
        except Exception as e:
            print(f"✗ Error backing up {table}: {e}")
            backup_data[table] = []
    
    # Save backup file
    with open(backup_file, 'w') as f:
        json.dump(backup_data, f, indent=2, default=str)
    
    print(f"✓ Backup completed: {backup_file}")
    return backup_file

if __name__ == "__main__":
    backup_database()