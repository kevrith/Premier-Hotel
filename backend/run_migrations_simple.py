#!/usr/bin/env python3
"""
Simple migration runner using urllib (no extra dependencies)
"""
import urllib.request
import urllib.parse
import json
import os
from pathlib import Path

# Your Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://njhjpxfozgpoiqwksple.supabase.co")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable not set")
    import sys
    sys.exit(1)

def execute_sql(sql_query):
    """Execute SQL using Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    data = json.dumps({"query": sql_query}).encode('utf-8')

    req = urllib.request.Request(url, data=data, headers=headers, method='POST')

    try:
        with urllib.request.urlopen(req) as response:
            result = response.read().decode('utf-8')
            return True, result
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode('utf-8')
        return False, error_msg
    except Exception as e:
        return False, str(e)

def run_migration_file(filepath):
    """Read and execute a migration file"""
    print(f"\n{'='*60}")
    print(f"Running: {filepath}")
    print(f"{'='*60}")

    try:
        sql_content = Path(filepath).read_text()
        success, result = execute_sql(sql_content)

        if success:
            print(f"✅ Successfully executed {filepath}")
            print(f"Result: {result[:200]}..." if len(result) > 200 else f"Result: {result}")
            return True
        else:
            print(f"❌ Error: {result}")
            return False

    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("PREMIER HOTEL - SQL MIGRATIONS 013 & 015")
    print("="*60)

    migrations = [
        "sql/migrations/013_add_performance_indexes.sql",
        "sql/migrations/015_add_foreign_key_constraints.sql"
    ]

    success_count = 0
    failed_count = 0

    for migration in migrations:
        if run_migration_file(migration):
            success_count += 1
        else:
            failed_count += 1

    print("\n" + "="*60)
    print(f"SUMMARY: {success_count} succeeded, {failed_count} failed")
    print("="*60 + "\n")

    return 0 if failed_count == 0 else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
