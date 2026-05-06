"""
Manual backup script — run this any time before making database changes.

Usage:
    cd backend
    ./venv/bin/python3 backup_data.py

Creates a timestamped JSON file in backend/backups/ with all critical table data.
To restore: open the file and paste the INSERT statements into Supabase SQL Editor.
"""

import json
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from dotenv import load_dotenv
load_dotenv()

from app.core.supabase import SupabaseClient

TABLES = [
    'menu_items',
    'rooms',
    'location_stock',
    'kitchen_stock',
    'ingredients_stock',
    'utensils_stock',
    'office_stock',
    'users',
]

def backup():
    supabase = SupabaseClient.get_admin_client()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_dir = os.path.join(os.path.dirname(__file__), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    filename = os.path.join(backup_dir, f'backup_{timestamp}.json')

    backup_data = {'timestamp': timestamp, 'tables': {}}

    for table in TABLES:
        try:
            result = supabase.table(table).select('*').execute()
            rows = result.data or []
            backup_data['tables'][table] = rows
            print(f'  OK  {table:<25} {len(rows)} rows')
        except Exception as e:
            print(f'  --  {table:<25} skipped ({e})')
            backup_data['tables'][table] = []

    with open(filename, 'w') as f:
        json.dump(backup_data, f, indent=2, default=str)

    total = sum(len(v) for v in backup_data['tables'].values())
    print(f'\nBackup saved → {filename}')
    print(f'Total rows backed up: {total}')
    print('\nTo restore a table from this backup, run restore_data.py')


if __name__ == '__main__':
    backup()
