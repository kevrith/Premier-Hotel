# Inventory Management System - Complete Guide

## Overview

The Premier Hotel system includes a comprehensive **Inventory Management System** that tracks stock levels, manages suppliers, monitors consumption, and links menu items to inventory items for automatic stock deduction.

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Understanding the Dual System](#understanding-the-dual-system)
3. [How Beverages Work](#how-beverages-work)
4. [Database Tables](#database-tables)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Usage Examples](#usage-examples)
8. [Migration Instructions](#migration-instructions)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    INVENTORY MANAGEMENT SYSTEM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │  Menu Items  │◄────────┤   Mapping    │                     │
│  │  (Customer)  │         │    Table     │                     │
│  └──────────────┘         └──────────────┘                     │
│         │                         │                             │
│         │                         ▼                             │
│         │                 ┌──────────────┐                     │
│         └────────────────►│   Inventory  │                     │
│                           │     Items    │                     │
│                           │   (Backend)  │                     │
│                           └──────────────┘                     │
│                                   │                             │
│                                   ▼                             │
│                          ┌────────────────┐                    │
│                          │  Transactions  │                    │
│                          │  & Alerts      │                    │
│                          └────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Understanding the Dual System

### Why Two Systems?

The system uses **TWO interconnected but distinct concepts**:

### 1. **Menu Items** (Customer-Facing)
- **Purpose**: What customers see and order
- **Contains**: Name, description, price, images, categories
- **Example**: "Coca-Cola 500ml - KES 150"
- **Location**: `menu_items` table
- **Who manages**: Restaurant/Bar manager via Content Management

### 2. **Inventory Items** (Stock Tracking)
- **Purpose**: What you actually have in stock
- **Contains**: Quantity, cost, supplier, reorder points
- **Example**: "Coca-Cola 500ml - 48 bottles in stock"
- **Location**: `inventory_items` table
- **Who manages**: Inventory manager via Inventory Management

### 3. **The Connection** (Menu ↔ Inventory Mapping)
- **Purpose**: Link menu items to their ingredients/components
- **Contains**: Quantity required per serving
- **Example**: "1 order of Coca-Cola 500ml = 1 bottle from inventory"
- **Location**: `menu_inventory_mapping` table
- **Automatic**: Stock deducts when order is marked as delivered

---

## How Beverages Work

### Example: Coca-Cola 500ml

#### Step 1: Create Inventory Item
```
Inventory Item:
├─ Name: Coca-Cola 500ml
├─ SKU: BEV-COKE-500
├─ Category: Beverages > Soft Drinks
├─ Current Stock: 48 bottles
├─ Unit of Measure: bottles
├─ Minimum Stock: 12 bottles
├─ Reorder Point: 24 bottles
├─ Cost per Unit: KES 80
├─ Supplier: Kenya Bottlers Ltd
└─ Storage Location: Beverage Cooler 1
```

#### Step 2: Create Menu Item
```
Menu Item:
├─ Name: Coca-Cola 500ml
├─ Description: Ice-cold Coca-Cola
├─ Price: KES 150
├─ Category: Beverages
├─ Available: Yes
└─ Image: /images/coke.jpg
```

#### Step 3: Link Them Together
```
Menu-Inventory Mapping:
├─ Menu Item ID: [Coca-Cola 500ml menu item]
├─ Inventory Item ID: [Coca-Cola 500ml inventory item]
├─ Quantity Required: 1.0
├─ Unit of Measure: bottles
└─ Cost Percentage: 53% (80/150)
```

#### Step 4: Customer Orders
```
Customer orders "Coca-Cola 500ml" from menu
    ↓
Order created with menu_item_id
    ↓
Waiter marks order as "delivered"
    ↓
System finds mapping: 1 bottle needed
    ↓
Inventory automatically deducts: 48 → 47 bottles
    ↓
Transaction recorded: "Sale to Order #12345"
    ↓
Alert triggered if stock ≤ reorder point
```

---

## Database Tables

### 1. **inventory_categories**
Organizes inventory into categories.

| Column      | Type   | Description                |
|-------------|--------|----------------------------|
| id          | UUID   | Primary key                |
| name        | String | Category name (unique)     |
| description | Text   | Optional description       |
| icon        | String | Icon identifier            |

**Examples:**
- Beverages
- Food - Dry Goods
- Food - Fresh Produce
- Cleaning Supplies
- Linens & Textiles

### 2. **inventory_items**
Main inventory tracking table.

| Column             | Type    | Description                    |
|--------------------|---------|--------------------------------|
| id                 | UUID    | Primary key                    |
| category_id        | UUID    | FK to categories               |
| name               | String  | Item name                      |
| sku                | String  | Stock keeping unit (unique)    |
| current_stock      | Decimal | Current quantity               |
| unit_of_measure    | String  | kg, liters, pieces, etc.       |
| minimum_stock      | Decimal | Minimum before alert           |
| reorder_point      | Decimal | Trigger reorder alert          |
| reorder_quantity   | Decimal | How much to reorder            |
| cost_per_unit      | Decimal | Purchase cost                  |
| selling_price      | Decimal | Optional selling price         |
| supplier_name      | String  | Supplier name                  |
| storage_location   | String  | Where it's stored              |
| is_perishable      | Boolean | Requires expiry tracking       |
| status             | Enum    | active, inactive, discontinued |

### 3. **inventory_transactions**
Tracks all stock movements (audit trail).

| Column             | Type    | Description                    |
|--------------------|---------|--------------------------------|
| id                 | UUID    | Primary key                    |
| inventory_item_id  | UUID    | FK to inventory_items          |
| transaction_type   | Enum    | purchase, sale, adjustment     |
| quantity           | Decimal | Quantity changed (+ or -)      |
| stock_before       | Decimal | Stock level before             |
| stock_after        | Decimal | Stock level after              |
| reference_type     | String  | order, booking, manual         |
| reference_id       | UUID    | FK to order/booking            |
| notes              | Text    | Optional notes                 |
| created_by         | UUID    | User who made change           |

### 4. **menu_inventory_mapping**
Links menu items to inventory items.

| Column             | Type    | Description                    |
|--------------------|---------|--------------------------------|
| id                 | UUID    | Primary key                    |
| menu_item_id       | UUID    | FK to menu_items               |
| inventory_item_id  | UUID    | FK to inventory_items          |
| quantity_required  | Decimal | Amount needed per serving      |
| unit_of_measure    | String  | Unit for quantity              |
| cost_percentage    | Decimal | % of menu price (optional)     |

**Example:**
```sql
INSERT INTO menu_inventory_mapping VALUES (
  uuid_generate_v4(),
  'menu-item-coke-500ml-id',     -- Menu item: Coca-Cola 500ml
  'inventory-item-coke-id',       -- Inventory: Coca-Cola bottles
  1.0,                            -- 1 bottle per order
  'bottles',                      -- Unit
  53.33                           -- 53% cost (80/150)
);
```

### 5. **inventory_alerts**
Automated alerts for low stock, expiring items.

| Column             | Type    | Description                    |
|--------------------|---------|--------------------------------|
| id                 | UUID    | Primary key                    |
| inventory_item_id  | UUID    | FK to inventory_items          |
| alert_type         | Enum    | low_stock, out_of_stock        |
| severity           | Enum    | low, medium, high, critical    |
| message            | Text    | Human-readable message         |
| is_resolved        | Boolean | Alert resolved?                |
| resolved_at        | Timestamp | When resolved                |

---

## API Endpoints

### Categories
```
GET    /api/v1/inventory/categories       - List all categories
POST   /api/v1/inventory/categories       - Create category
```

### Inventory Items
```
GET    /api/v1/inventory/items            - List items (with filters)
GET    /api/v1/inventory/items/{id}       - Get single item
POST   /api/v1/inventory/items            - Create item
PATCH  /api/v1/inventory/items/{id}       - Update item
DELETE /api/v1/inventory/items/{id}       - Discontinue item
POST   /api/v1/inventory/items/{id}/adjust-stock - Adjust stock
```

**Filter Parameters:**
- `category_id` - Filter by category
- `status` - Filter by status (active, inactive, discontinued)
- `low_stock_only` - Show only low stock items
- `search` - Search by name/SKU
- `skip`, `limit` - Pagination

### Transactions
```
GET    /api/v1/inventory/transactions     - Transaction history
```

### Alerts
```
GET    /api/v1/inventory/alerts           - Get alerts
PATCH  /api/v1/inventory/alerts/{id}/resolve - Resolve alert
```

### Dashboard
```
GET    /api/v1/inventory/dashboard        - Statistics overview
```

### Menu-Inventory Mapping
```
GET    /api/v1/inventory/menu-mapping/{menu_item_id}  - Get mappings
POST   /api/v1/inventory/menu-mapping                 - Create mapping
DELETE /api/v1/inventory/menu-mapping/{id}            - Delete mapping
```

---

## Frontend Components

### Admin Dashboard → Inventory Tab

The Inventory Management interface provides:

1. **Dashboard Stats**
   - Total items
   - Low stock items (yellow)
   - Out of stock items (red)
   - Total inventory value

2. **Inventory Items Tab**
   - Full list with search/filters
   - Stock status indicators
   - Quick actions (Edit, Adjust Stock, Delete)
   - Export/Import functionality

3. **Beverages Tab**
   - Dedicated view for beverage inventory
   - Linked to menu items
   - Shows menu availability based on stock

4. **Analytics Tab**
   - Stock turnover rates
   - Usage patterns
   - Cost analysis

5. **Transactions Tab**
   - Complete audit trail
   - Filter by date, type, item

---

## Usage Examples

### Example 1: Adding a New Beverage

**Scenario:** You want to add "Fanta Orange 500ml" to your menu

#### Step 1: Add to Inventory
```
Navigate to: Admin Dashboard → Inventory → Add Item
Fill in:
- Name: Fanta Orange 500ml
- SKU: BEV-FANTA-OR-500
- Category: Beverages
- Current Stock: 60 bottles
- Unit: bottles
- Minimum Stock: 12
- Reorder Point: 24
- Cost per Unit: KES 75
- Supplier: Kenya Bottlers Ltd
```

#### Step 2: Add to Menu
```
Navigate to: Admin Dashboard → Content → Menu Items → Add Item
Fill in:
- Name: Fanta Orange 500ml
- Category: Beverages
- Price: KES 140
- Description: Refreshing orange soda
```

#### Step 3: Link Them (Optional but Recommended)
```
Use API or upcoming UI:
POST /api/v1/inventory/menu-mapping
{
  "menu_item_id": "[fanta-menu-id]",
  "inventory_item_id": "[fanta-inventory-id]",
  "quantity_required": 1.0,
  "unit_of_measure": "bottles"
}
```

### Example 2: Restocking

**Scenario:** Coca-Cola stock is low, you received a new delivery

```
Navigate to: Admin Dashboard → Inventory → Items
Find: Coca-Cola 500ml
Click: Adjust Stock
Select: Purchase
Quantity: +100 (received 100 bottles)
Unit Cost: KES 80
Notes: "Supplier delivery - Invoice #12345"
Submit
```

**What happens:**
- Stock: 12 → 112 bottles
- Transaction recorded
- Alert auto-resolves if above reorder point
- Inventory value updated

### Example 3: Manual Stock Adjustment

**Scenario:** Found 5 broken Coca-Cola bottles

```
Navigate to: Admin Dashboard → Inventory → Items
Find: Coca-Cola 500ml
Click: Adjust Stock
Select: Waste
Quantity: -5
Reason: "Broken bottles during storage"
Submit
```

**What happens:**
- Stock: 112 → 107 bottles
- Transaction recorded as "waste"
- Value adjustment calculated

---

## Migration Instructions

### Run the SQL Migration

The inventory tables are defined in:
**File:** `backend/sql/migrations/create_inventory_tables.sql`

#### Option 1: Supabase Dashboard
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy the contents of `create_inventory_tables.sql`
5. Paste and click **Run**

#### Option 2: Python Script
```bash
cd backend
python3 run_inventory_migration.py
```

### Verify Tables Created

Run this SQL to verify:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE 'inventory%'
       OR table_name LIKE 'stock%'
       OR table_name = 'menu_inventory_mapping')
ORDER BY table_name;
```

**Expected tables:**
- inventory_alerts
- inventory_categories
- inventory_items
- inventory_transactions
- menu_inventory_mapping
- stock_audit_items
- stock_audits

---

## Key Features

### ✅ Implemented
- [x] Complete database schema
- [x] Backend API endpoints (already existed)
- [x] Frontend API client (already existed)
- [x] Admin UI component
- [x] Dashboard statistics
- [x] Stock adjustment workflow
- [x] Alert system
- [x] Transaction tracking
- [x] Menu-inventory mapping

### 🚧 To Be Implemented
- [ ] Automatic stock deduction on order delivery
- [ ] Batch operations (bulk upload)
- [ ] Barcode scanning
- [ ] Expiry date tracking
- [ ] Stock take/audit workflow
- [ ] Supplier management interface
- [ ] Purchase order system
- [ ] Analytics charts
- [ ] Email alerts for low stock
- [ ] Mobile inventory app

---

## Best Practices

### 1. **Always Link Menu Items to Inventory**
- Enables automatic stock tracking
- Provides accurate cost analysis
- Prevents selling out-of-stock items

### 2. **Set Realistic Reorder Points**
```
Reorder Point = (Daily Usage × Lead Time) + Safety Stock

Example:
- Daily Usage: 10 bottles
- Lead Time: 3 days
- Safety Stock: 10 bottles
- Reorder Point: (10 × 3) + 10 = 40 bottles
```

### 3. **Regular Stock Audits**
- Perform physical counts weekly/monthly
- Compare with system counts
- Investigate discrepancies

### 4. **Track Everything**
- Use transaction types appropriately
- Add notes to adjustments
- Link to orders/bookings when possible

### 5. **Monitor Alerts**
- Check daily for low stock
- Set up SMS/email notifications
- Respond quickly to critical alerts

---

## Troubleshooting

### Issue: Menu item shows "Available" but inventory shows 0

**Cause:** Menu availability not linked to inventory

**Solution:**
1. Create menu-inventory mapping
2. System will auto-update menu availability based on stock

### Issue: Stock not deducting when order is delivered

**Cause:** Missing menu-inventory mapping

**Solution:**
1. Check if mapping exists
2. Create mapping if missing
3. Ensure order status is "delivered" not "completed"

### Issue: Duplicate SKUs

**Cause:** SKU must be unique

**Solution:**
1. Use format: `CATEGORY-BRAND-SIZE`
2. Example: `BEV-COKE-500`, `BEV-COKE-1000`

---

## Summary

The Premier Hotel Inventory Management System provides:

1. **Dual System**: Menu items (customer-facing) + Inventory items (stock tracking)
2. **Automatic Tracking**: Stock deducts when orders are delivered
3. **Smart Alerts**: Get notified before you run out
4. **Full Audit Trail**: Every stock movement is tracked
5. **Cost Control**: Know your costs, margins, and valuations
6. **Enterprise Ready**: Scalable for multiple locations

**Beverages like sodas exist in BOTH systems:**
- **Menu**: What customers order (with price)
- **Inventory**: What you have in stock (with quantity)
- **Mapping**: Connects them for automatic tracking

---

## Need Help?

Contact the development team or refer to:
- Backend API docs: `/backend/app/api/v1/endpoints/inventory.py`
- Frontend component: `/src/components/Admin/InventoryManagement.tsx`
- Database schema: `/backend/sql/migrations/create_inventory_tables.sql`
