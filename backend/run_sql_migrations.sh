#!/bin/bash
# Run SQL migrations 013 and 015 using psql directly

set -e  # Exit on any error

echo "============================================================"
echo "PREMIER HOTEL - SQL MIGRATIONS 013 & 015"
echo "============================================================"

# Database connection details from .env
DB_HOST="db.njhjpxfozgpoiqwksple.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
DB_PASS="IShopOnline1"

echo ""
echo "Connecting to database..."
echo "Host: $DB_HOST"
echo ""

# Run Migration 013
echo "Running Migration 013: Performance Indexes"
echo "------------------------------------------------------------"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f sql/migrations/013_add_performance_indexes.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 013 completed successfully"
else
    echo "❌ Migration 013 failed"
    exit 1
fi

echo ""
echo "Running Migration 015: Foreign Key Constraints"
echo "------------------------------------------------------------"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f sql/migrations/015_add_foreign_key_constraints.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration 015 completed successfully"
else
    echo "❌ Migration 015 failed"
    exit 1
fi

echo ""
echo "============================================================"
echo "✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY"
echo "============================================================"
