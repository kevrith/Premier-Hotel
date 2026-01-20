#!/bin/bash

# =====================================================
# Run Inventory System Migrations
# =====================================================
# This script runs both inventory migrations in order
# =====================================================

echo "=========================================="
echo "Premier Hotel - Inventory Migrations"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ]; then
    echo -e "${RED}Error: SUPABASE_URL not set${NC}"
    echo "Please set your Supabase URL:"
    echo "  export SUPABASE_URL='https://your-project.supabase.co'"
    exit 1
fi

if [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_SERVICE_KEY not set${NC}"
    echo "Please set your Supabase service role key:"
    echo "  export SUPABASE_SERVICE_KEY='your-service-role-key'"
    exit 1
fi

# Migration 1: Core Inventory Tables
echo -e "${BLUE}[1/2] Running core inventory tables migration...${NC}"
echo ""

MIGRATION_1=$(cat backend/sql/migrations/create_inventory_tables_fixed.sql)

RESPONSE_1=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_1" | jq -Rs .)}")

if echo "$RESPONSE_1" | grep -q "error"; then
    echo -e "${RED}✗ Migration 1 FAILED${NC}"
    echo "$RESPONSE_1" | jq .
    exit 1
else
    echo -e "${GREEN}✓ Migration 1 completed successfully${NC}"
    echo "  Created tables:"
    echo "    - inventory_categories"
    echo "    - inventory_items"
    echo "    - inventory_transactions"
    echo "    - menu_inventory_mapping"
    echo "    - inventory_alerts"
    echo "    - stock_audits"
    echo "    - stock_audit_items"
fi

echo ""

# Migration 2: Purchase Orders & Valuation
echo -e "${BLUE}[2/2] Running purchase orders & valuation migration...${NC}"
echo ""

MIGRATION_2=$(cat backend/sql/migrations/add_purchase_orders_and_valuation_fixed.sql)

RESPONSE_2=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(echo "$MIGRATION_2" | jq -Rs .)}")

if echo "$RESPONSE_2" | grep -q "error"; then
    echo -e "${RED}✗ Migration 2 FAILED${NC}"
    echo "$RESPONSE_2" | jq .
    exit 1
else
    echo -e "${GREEN}✓ Migration 2 completed successfully${NC}"
    echo "  Created tables:"
    echo "    - suppliers"
    echo "    - purchase_orders"
    echo "    - purchase_order_items"
    echo "    - goods_received_notes"
    echo "    - inventory_valuations"
    echo "    - inventory_valuation_items"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ All migrations completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Database is ready. You can now:"
echo "  1. Start the backend: cd backend && ./venv/bin/python3.12 -m uvicorn app.main:app --reload"
echo "  2. Test the API at: http://localhost:8000/docs"
echo ""
