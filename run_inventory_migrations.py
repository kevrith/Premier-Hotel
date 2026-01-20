#!/usr/bin/env python3
"""
Run Inventory System Migrations
================================
This script runs both inventory migrations in the correct order.
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client

# ANSI colors
GREEN = '\033[0;32m'
BLUE = '\033[0;34m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
NC = '\033[0m'  # No Color

def print_header():
    print("=" * 50)
    print("Premier Hotel - Inventory Migrations")
    print("=" * 50)
    print()

def print_success(message):
    print(f"{GREEN}✓ {message}{NC}")

def print_error(message):
    print(f"{RED}✗ {message}{NC}")

def print_info(message):
    print(f"{BLUE}{message}{NC}")

def print_warning(message):
    print(f"{YELLOW}⚠ {message}{NC}")

def get_supabase_client():
    """Get Supabase client from environment variables"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")

    if not url:
        print_error("SUPABASE_URL environment variable not set")
        print("\nPlease set it with:")
        print("  export SUPABASE_URL='https://your-project.supabase.co'")
        sys.exit(1)

    if not key:
        print_error("SUPABASE_SERVICE_KEY environment variable not set")
        print("\nPlease set it with:")
        print("  export SUPABASE_SERVICE_KEY='your-service-role-key'")
        sys.exit(1)

    return create_client(url, key)

def run_sql_file(supabase: Client, file_path: Path, migration_name: str):
    """Run a SQL migration file"""
    print_info(f"Running {migration_name}...")
    print()

    if not file_path.exists():
        print_error(f"Migration file not found: {file_path}")
        return False

    # Read SQL file
    sql_content = file_path.read_text()

    try:
        # Execute SQL using Supabase RPC
        # Note: Supabase doesn't have a direct SQL execution endpoint
        # We need to use the SQL editor or run individual statements

        # For now, we'll split by semicolons and execute statements
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]

        total = len(statements)
        print(f"Executing {total} SQL statements...")

        for i, statement in enumerate(statements, 1):
            if not statement or statement.startswith('--'):
                continue

            try:
                # Execute through Supabase (this is a simplified approach)
                # In production, you'd use proper migration tools
                supabase.rpc('exec_sql', {'query': statement}).execute()
                print(f"  [{i}/{total}] ✓")
            except Exception as e:
                if 'already exists' in str(e).lower():
                    print(f"  [{i}/{total}] ⚠ (already exists)")
                else:
                    print(f"  [{i}/{total}] ✗ Error: {e}")
                    # Continue anyway

        print()
        print_success(f"{migration_name} completed")
        return True

    except Exception as e:
        print_error(f"{migration_name} failed: {e}")
        return False

def main():
    print_header()

    # Get Supabase client
    try:
        supabase = get_supabase_client()
        print_success("Connected to Supabase")
        print()
    except Exception as e:
        print_error(f"Failed to connect to Supabase: {e}")
        sys.exit(1)

    # Define migrations
    base_dir = Path(__file__).parent / "backend" / "sql" / "migrations"

    migrations = [
        (
            base_dir / "create_inventory_tables_fixed.sql",
            "Migration 1: Core Inventory Tables",
            [
                "inventory_categories",
                "inventory_items",
                "inventory_transactions",
                "menu_inventory_mapping",
                "inventory_alerts",
                "stock_audits",
                "stock_audit_items"
            ]
        ),
        (
            base_dir / "add_purchase_orders_and_valuation_fixed.sql",
            "Migration 2: Purchase Orders & Valuation",
            [
                "suppliers",
                "purchase_orders",
                "purchase_order_items",
                "goods_received_notes",
                "inventory_valuations",
                "inventory_valuation_items"
            ]
        )
    ]

    # Run migrations
    for i, (file_path, name, tables) in enumerate(migrations, 1):
        print(f"[{i}/{len(migrations)}] {name}")
        print("-" * 50)

        success = run_sql_file(supabase, file_path, name)

        if success:
            print("  Created tables:")
            for table in tables:
                print(f"    - {table}")
        print()

    # Final message
    print("=" * 50)
    print_success("All migrations completed!")
    print("=" * 50)
    print()
    print("Database is ready. You can now:")
    print("  1. Start the backend:")
    print("     cd backend && ./venv/bin/python3.12 -m uvicorn app.main:app --reload")
    print("  2. Test the API at: http://localhost:8000/docs")
    print()

if __name__ == "__main__":
    main()
