# 🔧 Database Migration Instructions

## ✅ Fixed SQL Migrations Ready

I've created **fixed versions** of both migrations that resolve the errors you encountered:

1. ✅ **create_inventory_tables_fixed.sql** - Core inventory tables
2. ✅ **add_purchase_orders_and_valuation_fixed.sql** - Purchase orders & valuation

---

## 🔍 What Was Fixed

### Error 1: "column 'status' does not exist"
**Problem**: The original SQL used `CREATE TABLE IF NOT EXISTS` which can cause issues when the table partially exists.

**Fix**: Added `DROP TABLE IF EXISTS` statements at the beginning to ensure clean creation.

### Error 2: "relation 'stock_audits' does not exist"
**Problem**: The second migration referenced `stock_audits` table from the first migration, but if the first migration failed, the table wouldn't exist.

**Fix**:
- Removed `stock_audit_results` table (it was redundant)
- Ensured proper dependency order
- Added clear instructions to run migrations in sequence

---

## 🚀 Option 1: Run via Supabase Dashboard (RECOMMENDED)

This is the **easiest and most reliable** method.

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run Migration 1
1. Copy the entire contents of:
   ```
   backend/sql/migrations/create_inventory_tables_fixed.sql
   ```

2. Paste into the SQL editor

3. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

4. Wait for completion (should see "Success" message)

5. Verify tables created:
   - inventory_categories
   - inventory_items
   - inventory_transactions
   - menu_inventory_mapping
   - inventory_alerts
   - stock_audits
   - stock_audit_items

### Step 3: Run Migration 2
1. Copy the entire contents of:
   ```
   backend/sql/migrations/add_purchase_orders_and_valuation_fixed.sql
   ```

2. Paste into a new SQL query

3. Click **Run**

4. Wait for completion

5. Verify tables created:
   - suppliers
   - purchase_orders
   - purchase_order_items
   - goods_received_notes
   - inventory_valuations
   - inventory_valuation_items

### Step 4: Verify All Tables
In the SQL Editor, run:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'inventory%'
  OR table_name IN ('suppliers', 'purchase_orders', 'purchase_order_items', 'goods_received_notes', 'stock_audits', 'stock_audit_items')
ORDER BY table_name;
```

You should see **13 tables** total.

---

## 🚀 Option 2: Run via Command Line (Alternative)

### Prerequisites
```bash
# Install jq if not already installed (for JSON parsing)
sudo apt-get install jq  # Ubuntu/Debian
# or
brew install jq  # macOS
```

### Set Environment Variables
```bash
export SUPABASE_URL='https://your-project-ref.supabase.co'
export SUPABASE_SERVICE_KEY='your-service-role-key-here'
```

**Where to find these:**
- Supabase Dashboard → Settings → API
- URL: Project URL
- Service Key: service_role key (⚠️ Keep this secret!)

### Run Migrations
```bash
# Make script executable
chmod +x run_inventory_migrations.sh

# Run migrations
./run_inventory_migrations.sh
```

---

## 🚀 Option 3: Run via Python Script (Alternative)

### Prerequisites
```bash
# Install Supabase Python client
cd backend
./venv/bin/pip install supabase
```

### Set Environment Variables
```bash
export SUPABASE_URL='https://your-project-ref.supabase.co'
export SUPABASE_SERVICE_KEY='your-service-role-key-here'
```

### Run Migrations
```bash
# Make script executable
chmod +x run_inventory_migrations.py

# Run migrations
python3 run_inventory_migrations.py
```

---

## ✅ Verification Steps

After running migrations successfully, verify everything works:

### 1. Check Tables Exist
```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE 'inventory%'
    OR table_name IN ('suppliers', 'purchase_orders', 'purchase_order_items', 'goods_received_notes', 'stock_audits')
  );
```
Expected: **13 tables**

### 2. Check Sample Data
```sql
-- Should have 10 categories
SELECT COUNT(*) FROM inventory_categories;

-- Should have 5 suppliers
SELECT COUNT(*) FROM suppliers;
```

### 3. Test Backend API
```bash
# Start backend
cd backend
./venv/bin/python3.12 -m uvicorn app.main:app --reload
```

Then visit: http://localhost:8000/docs

Look for these new endpoints:
- `/api/v1/purchase-orders/suppliers`
- `/api/v1/purchase-orders/dashboard/stats`

---

## 🎯 What Each Migration Does

### Migration 1: Core Inventory (create_inventory_tables_fixed.sql)

**Tables Created:**
1. `inventory_categories` - Beverage, Food, Linens, etc.
2. `inventory_items` - All tracked items with stock levels
3. `inventory_transactions` - Complete audit trail
4. `menu_inventory_mapping` - Links menu items → inventory
5. `inventory_alerts` - Low stock notifications
6. `stock_audits` - Physical count records
7. `stock_audit_items` - Audit details

**Features:**
- ✅ Auto-generate low stock alerts
- ✅ Track every stock movement
- ✅ Link menu items to inventory ingredients
- ✅ Audit trail for compliance
- ✅ Seed data: 10 default categories

### Migration 2: Purchase Orders (add_purchase_orders_and_valuation_fixed.sql)

**Tables Created:**
1. `suppliers` - Vendor management
2. `purchase_orders` - PO creation & tracking
3. `purchase_order_items` - PO line items
4. `goods_received_notes` - Receipt confirmation
5. `inventory_valuations` - Date-based stock value
6. `inventory_valuation_items` - Valuation details

**Features:**
- ✅ Auto-generate PO numbers (PO-2026-0001)
- ✅ Auto-generate GRN numbers (GRN-2026-0001)
- ✅ Auto-update PO totals when items change
- ✅ Calculate inventory valuation by date
- ✅ Seed data: 5 Kenyan suppliers

---

## 🔥 Common Issues & Solutions

### Issue: "permission denied"
**Solution**: Make sure you're using the **service_role** key, not the anon key.

### Issue: "relation already exists"
**Solution**: The fixed migrations have `DROP TABLE IF EXISTS` - they will clean up and recreate.

### Issue: "function does not exist"
**Solution**: Run migrations in order (1 before 2). Migration 1 creates functions that Migration 2 depends on.

### Issue: Can't connect to Supabase
**Solution**:
1. Check SUPABASE_URL is correct (should start with https://)
2. Check SUPABASE_SERVICE_KEY is the service_role key
3. Make sure your Supabase project is not paused

---

## 📞 Next Steps After Migration

Once migrations complete successfully:

1. ✅ **Start Backend**
   ```bash
   cd backend
   ./venv/bin/python3.12 -m uvicorn app.main:app --reload
   ```

2. ✅ **Test Purchase Orders API**
   - Visit http://localhost:8000/docs
   - Try `/api/v1/purchase-orders/suppliers` endpoint
   - Should return 5 sample suppliers

3. ✅ **Build Frontend UI** (Next phase)
   - TypeScript API client
   - Purchase Order creation form
   - Goods receipt interface
   - Inventory management dashboard

---

## 🎉 Success Criteria

You'll know migrations succeeded when:

1. ✅ All 13 tables exist in Supabase
2. ✅ 10 inventory categories seeded
3. ✅ 5 suppliers seeded
4. ✅ Backend starts without errors
5. ✅ API docs show purchase-orders endpoints
6. ✅ Can create test PO via API

---

## 📝 Files Reference

**Fixed Migrations:**
- `backend/sql/migrations/create_inventory_tables_fixed.sql` (400 lines)
- `backend/sql/migrations/add_purchase_orders_and_valuation_fixed.sql` (350 lines)

**Migration Scripts:**
- `run_inventory_migrations.sh` (Bash script)
- `run_inventory_migrations.py` (Python script)

**Documentation:**
- `PURCHASE_ORDER_IMPLEMENTATION.md` - How PO system works
- `INVENTORY_COMPLETE_SUMMARY.md` - Complete inventory guide
- `MIGRATION_INSTRUCTIONS.md` - This file

**Backend API:**
- `backend/app/api/v1/endpoints/purchase_orders.py` (800+ lines) - Ready to use!

---

Need help? The migrations are ready to run - just choose your preferred method above! 🚀
