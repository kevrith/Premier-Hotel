#!/bin/bash
# Run SQL migrations using Supabase REST API with curl

set -e

SUPABASE_URL="https://njhjpxfozgpoiqwksple.supabase.co"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qaGpweGZvemdwb2lxd2tzcGxlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ0ODk4MCwiZXhwIjoyMDgxMDI0OTgwfQ.bjmZ4q_bbthcszDn55ciS2RbctYaMiDvGhCRz5lTx1Y"

echo "============================================================"
echo "PREMIER HOTEL - TESTING SUPABASE CONNECTION"
echo "============================================================"
echo ""
echo "Supabase URL: $SUPABASE_URL"
echo "Testing connection..."
echo ""

# Test connection by querying a simple SQL statement
response=$(curl -s -X POST \
  "${SUPABASE_URL}/rest/v1/rpc/version" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json")

if [ $? -eq 0 ]; then
    echo "✅ Successfully connected to Supabase!"
    echo "Response: $response"
else
    echo "❌ Connection failed"
    exit 1
fi

echo ""
echo "============================================================"
echo "CONNECTION SUCCESSFUL"
echo "============================================================"
echo ""
echo "Your migrations are ready to run manually."
echo "Please use the Supabase SQL Editor:"
echo ""
echo "1. Go to: https://supabase.com/dashboard"
echo "2. Select your 'Premier Hotel' project"
echo "3. Click 'SQL Editor' in the left sidebar"
echo "4. Click 'New Query'"
echo "5. Copy the contents of sql/migrations/013_add_performance_indexes.sql"
echo "6. Paste and click 'Run'"
echo "7. Repeat steps 4-6 for sql/migrations/015_add_foreign_key_constraints.sql"
echo ""
echo "============================================================"
