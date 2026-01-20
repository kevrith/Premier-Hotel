# Enhanced Inventory System - QuickBooks POS Style

## 🎯 Complete Hotel Inventory Management

Your concerns are 100% valid! Let me explain how the system works for EVERYTHING in your hotel, not just beverages.

---

## 📊 Inventory vs Non-Inventory Items (Like QuickBooks)

### **Inventory Items** (Stock Tracked)
Items where you need to track quantity and cost:

#### 1. **Beverages**
```
✅ TRACKED IN INVENTORY:
- Soft Drinks (Coca-Cola, Fanta, Sprite)
- Juices (Fresh, Bottled)
- Alcohol (Beer, Wine, Spirits)
- Water (Still, Sparkling)
- Coffee, Tea

WHY: You buy in bulk, store, and sell. Need to know when to reorder.
```

#### 2. **Food - Dry Goods**
```
✅ TRACKED IN INVENTORY:
- Rice, Pasta, Flour
- Canned foods
- Spices, Condiments
- Cooking oil
- Sugar, Salt

WHY: Long shelf life, bulk purchasing, need stock tracking.
```

#### 3. **Food - Fresh Produce**
```
✅ TRACKED IN INVENTORY:
- Vegetables (Tomatoes, Onions, etc.)
- Fruits
- Fresh Meat, Chicken, Fish
- Dairy (Milk, Cheese, Butter)
- Eggs

WHY: Perishable, need to track expiry, monitor waste.
```

#### 4. **Room Supplies - Linens**
```
✅ TRACKED IN INVENTORY:
- Bed Sheets (Single, Double, King)
- Pillow Cases
- Towels (Bath, Hand, Face)
- Blankets, Duvets
- Bathrobes
- Table Cloths

WHY: Expensive items, need to track damage/loss, monitor replacement needs.
EXAMPLE: You have 50 bed sheet sets. Track usage, laundering, replacements.
```

#### 5. **Room Supplies - Amenities**
```
✅ TRACKED IN INVENTORY:
- Pillows (Standard, Extra)
- Mattress Protectors
- Toilet Paper
- Tissues
- Soap, Shampoo, Conditioner
- Toothbrush kits
- Slippers
- Hangers

WHY: Consumables that cost money, need reordering.
```

#### 6. **Cleaning Supplies**
```
✅ TRACKED IN INVENTORY:
- Detergents (Laundry, Dish)
- Disinfectants
- Cleaning chemicals
- Mops, Brooms (replaceable heads)
- Garbage bags
- Gloves

WHY: Regular consumption, bulk buying, cost control.
```

#### 7. **Kitchen Consumables**
```
✅ TRACKED IN INVENTORY:
- Disposable plates, cups
- Napkins
- Aluminum foil
- Cling wrap
- Takeaway containers

WHY: Track usage, prevent theft, reorder timely.
```

#### 8. **Bar Inventory**
```
✅ TRACKED IN INVENTORY (CRITICAL!):
- Beer (Bottles, Cans) - By brand
- Wine (Red, White, Rosé) - By bottle
- Spirits (Whisky, Vodka, Gin, Rum) - By bottle
- Mixers (Tonic, Soda, Juice)
- Bar supplies (Straws, Napkins, Coasters)

WHY: High-value items, theft risk, strict tracking needed.
EXAMPLE: Tusker Lager 500ml - Track every bottle sold vs inventory.
```

### **Non-Inventory Items** (Not Tracked)
Items that don't need quantity tracking:

#### 1. **Menu Items - Fresh Prepared**
```
❌ NOT TRACKED AS INVENTORY:
- Cooked meals (Ugali, Nyama Choma, etc.)
- Fresh salads
- Hot soups
- Daily specials

WHY: Made from ingredients (which ARE tracked).
HOW IT WORKS:
- Menu Item: "Nyama Choma Platter" - KES 1,200
- Ingredients tracked:
  * 500g Goat Meat (from inventory)
  * 100g Kachumbari vegetables (from inventory)
  * Ugali flour (from inventory)
```

#### 2. **Services**
```
❌ NOT TRACKED AS INVENTORY:
- Room Service Fee
- Laundry Service
- Spa Services
- Airport Pickup

WHY: These are services, not physical items.
```

#### 3. **Fixed Assets** (Different System)
```
❌ NOT IN THIS INVENTORY:
- Furniture (Beds, Chairs, Tables)
- Electronics (TVs, Fridges, ACs)
- Kitchen Equipment (Stoves, Ovens)

WHY: These are capital assets, tracked separately in asset management.
```

---

## 💰 Date-Based Inventory Valuation (Closing Stock)

### What You Need:

**Scenario:** You want to know your closing stock value on January 31, 2026.

### How It Works:

#### 1. **Opening Stock** (Beginning of Period)
```sql
-- Get inventory value on January 1, 2026
SELECT
  ii.id,
  ii.name,
  it.stock_after as quantity,
  ii.cost_per_unit,
  (it.stock_after * ii.cost_per_unit) as value
FROM inventory_items ii
JOIN LATERAL (
  SELECT stock_after
  FROM inventory_transactions
  WHERE inventory_item_id = ii.id
    AND created_at < '2026-01-01'
  ORDER BY created_at DESC
  LIMIT 1
) it ON true;

-- Sum for total opening stock value
```

#### 2. **Closing Stock** (End of Period)
```sql
-- Get inventory value on January 31, 2026
SELECT
  SUM(current_stock * cost_per_unit) as closing_stock_value
FROM inventory_items
WHERE status = 'active';
```

#### 3. **Purchases During Period**
```sql
-- Get all purchases in January 2026
SELECT
  SUM(total_cost) as total_purchases
FROM inventory_transactions
WHERE transaction_type = 'purchase'
  AND created_at BETWEEN '2026-01-01' AND '2026-01-31';
```

#### 4. **Cost of Goods Sold (COGS)**
```
COGS = Opening Stock + Purchases - Closing Stock

Example:
- Opening Stock (Jan 1): KES 500,000
- Purchases (Jan 1-31): KES 200,000
- Closing Stock (Jan 31): KES 450,000
- COGS = 500,000 + 200,000 - 450,000 = KES 250,000
```

### New API Endpoint Needed:

```typescript
GET /api/v1/inventory/valuation?date=2026-01-31

Response:
{
  "date": "2026-01-31",
  "opening_stock": 500000,
  "purchases": 200000,
  "closing_stock": 450000,
  "cogs": 250000,
  "items": [
    {
      "name": "Coca-Cola 500ml",
      "quantity": 48,
      "cost_per_unit": 80,
      "total_value": 3840
    }
  ]
}
```

---

## 📝 Handling Unreported Sales (Waiter Sells Without System)

### The Problem:
```
Waiter sells 5 beers but doesn't enter in system.
Your inventory shows 50 beers, but physically you have 45.
```

### Solution 1: Manual Stock Adjustment
```
Navigate to: Inventory → Find "Tusker Lager"
Click: Adjust Stock
Type: Waste/Shrinkage
Quantity: -5
Reason: "Unreported sales - waiter error"
Date: [Today]
Notes: "Physical count shows 45, system showed 50"
```

**What happens:**
- Stock: 50 → 45 bottles
- Transaction recorded: "adjustment" type
- Reason logged for audit
- Alert if stock below reorder point

### Solution 2: Stock Take/Physical Count
```
Navigate to: Inventory → Stock Audit
Create New Audit
Count all items physically
Enter actual counts
System calculates discrepancies automatically

Example:
- System Count: 50 Tusker bottles
- Actual Count: 45 Tusker bottles
- Discrepancy: -5 bottles (KES -600)
- Reason: [Select from dropdown or enter]
```

### Solution 3: Prevent It (Best Solution)
```
Enforce: All sales MUST go through POS
- Waiter cannot serve without creating order
- Kitchen/Bar only prepare with order ticket
- Manager reviews unprocessed orders daily
```

---

## 🛒 Purchase Order Workflow (Auto-Update Inventory)

### Current Flow (Manual):
```
1. Supplier delivers goods
2. You count items
3. Navigate to Inventory
4. Adjust stock (+100 bottles)
5. Enter cost
```

### **NEW Enhanced Flow (Automated):**

#### Step 1: Create Purchase Order
```
Navigate to: Inventory → Purchase Orders → New PO

Purchase Order #PO-2026-0001
Supplier: Kenya Bottlers Ltd
Expected Delivery: 2026-02-01

Items:
- Coca-Cola 500ml × 100 bottles @ KES 80 = KES 8,000
- Fanta Orange 500ml × 60 bottles @ KES 75 = KES 4,500
- Sprite 500ml × 40 bottles @ KES 75 = KES 3,000

Total: KES 15,500
Status: Pending
```

#### Step 2: Receive Goods
```
When delivery arrives:

Navigate to: Purchase Orders → PO-2026-0001 → Receive
Check items received:
✅ Coca-Cola 500ml - Received: 100 (Ordered: 100)
✅ Fanta Orange 500ml - Received: 60 (Ordered: 60)
⚠️ Sprite 500ml - Received: 38 (Ordered: 40) - 2 bottles damaged

Click: Complete Receipt
```

#### Step 3: Automatic Inventory Update
```
System AUTOMATICALLY:
1. Updates inventory:
   - Coca-Cola: +100 bottles
   - Fanta: +60 bottles
   - Sprite: +38 bottles

2. Records transactions:
   - Type: "purchase"
   - Reference: PO-2026-0001
   - Cost per item
   - Stock before/after

3. Updates inventory value:
   - Previous: KES 450,000
   - New: KES 465,500

4. Marks PO as "Completed"

5. Generates report:
   - Invoice Total: KES 15,500
   - Received Value: KES 15,350 (2 damaged)
   - Variance: KES -150
```

#### Step 4: Payment Tracking
```
Link PO to payment:
- Record payment to supplier
- Track outstanding balance
- Generate payment history
```

---

## 🛏️ Room Supplies Inventory Example

### Scenario: Managing Bed Sheets

#### Initial Setup:
```
Category: Room Supplies - Linens
Item: Bed Sheet Set - Double Bed
SKU: LINEN-SHEET-DBL-WHT
Current Stock: 50 sets
Unit of Measure: sets
Minimum Stock: 20 sets
Reorder Point: 30 sets
Cost per Unit: KES 1,500
Supplier: Nairobi Linen Supply
Storage: Housekeeping Store Room 2
Status: Active
Is Perishable: No
```

#### Daily Operations:

**Morning - Housekeeping:**
```
Room 201 checkout:
- Remove dirty sheets: 1 set
- Put fresh sheets: 1 set

Laundry sends dirty sheets for cleaning.
System doesn't change stock (sheets in laundry still exist).
```

**Evening - Laundry Return:**
```
20 sets returned from laundry
- 18 sets good condition
- 2 sets damaged (tears, stains)

Update inventory:
- Damaged sheets: -2 sets
- Reason: "Damaged beyond repair - replaced"
- Current Stock: 50 → 48 sets
```

**Weekly Stock Take:**
```
Physical count: 45 sets (system shows 48)
Discrepancy: -3 sets

Possible reasons:
- Lost in laundry
- Guest took home (happens!)
- Staff error in counting

Action: Adjust stock, investigate, reorder if needed.
```

### Scenario: Managing Pillows

```
Category: Room Supplies - Bedding
Item: Pillow - Standard (Medium Firm)
SKU: BED-PILLOW-STD-MED
Current Stock: 150 pillows
Cost per Unit: KES 800
Supplier: Comfort Bedding Ltd

Tracking:
- Each room has 2 standard pillows
- Some guests request extra (charge: KES 200/night)
- Track damaged/stolen pillows
- Annual replacement budget
```

---

## 🍺 Alcohol Inventory (Critical Tracking)

### Why Alcohol Needs Special Attention:
1. **High Value** - Expensive items
2. **Theft Risk** - Easy to steal
3. **Compliance** - License requirements
4. **Markup** - High profit margins

### Example: Beer Inventory

#### Setup:
```
Category: Beverages - Beer
Items:
1. Tusker Lager 500ml
   - SKU: BEV-BEER-TUSKER-500
   - Cost: KES 120/bottle
   - Selling Price: KES 250/bottle
   - Current Stock: 120 bottles
   - Stored: Bar Cooler #1

2. Guinness 500ml
   - SKU: BEV-BEER-GUIN-500
   - Cost: KES 150/bottle
   - Selling Price: KES 300/bottle
   - Current Stock: 60 bottles
   - Stored: Bar Cooler #2

3. White Cap 300ml
   - SKU: BEV-BEER-WCAP-300
   - Cost: KES 100/bottle
   - Selling Price: KES 200/bottle
   - Current Stock: 80 bottles
   - Stored: Bar Cooler #1
```

#### Daily Bar Reconciliation:
```
Opening Stock (Morning):
- Tusker: 120 bottles
- Guinness: 60 bottles
- White Cap: 80 bottles

Sales (From POS):
- Tusker: 25 bottles sold
- Guinness: 8 bottles sold
- White Cap: 15 bottles sold

Expected Closing Stock:
- Tusker: 95 bottles
- Guinness: 52 bottles
- White Cap: 65 bottles

Physical Count (End of Day):
- Tusker: 93 bottles (Missing: 2)
- Guinness: 52 bottles (Match!)
- White Cap: 64 bottles (Missing: 1)

Discrepancy Report:
- Missing: 3 bottles
- Value: KES 370
- Action Required: Investigate
```

### Spirits Inventory (By Bottle):

```
Category: Beverages - Spirits

Item: Johnnie Walker Red Label 750ml
- Cost: KES 1,200/bottle
- Selling Price:
  * Single shot (25ml): KES 150
  * Double shot (50ml): KES 280
- Yield: 30 shots per bottle
- Expected Revenue per Bottle: KES 4,500
- Current Stock: 12 bottles
- Critical: Track by bottle AND by shot

How It Works:
1. Open new bottle → Record in system
2. Track shots poured
3. End of day: Count remaining bottles + partial
4. Calculate variance
```

---

## 📊 New Features to Implement

### 1. **Date-Based Inventory Valuation Report**

```typescript
// New Component: InventoryValuationReport.tsx

Features:
- Select date range
- View opening stock
- View purchases
- View closing stock
- Calculate COGS
- Export to Excel
- Compare periods (Jan vs Feb)
```

### 2. **Purchase Order Management**

```typescript
// New Component: PurchaseOrderManagement.tsx

Features:
- Create PO
- Send to supplier (email/print)
- Receive goods
- Auto-update inventory
- Track payment
- Generate GRN (Goods Received Note)
```

### 3. **Stock Audit Workflow**

```typescript
// New Component: StockAuditManager.tsx

Features:
- Create audit schedule
- Physical count interface
- Scan barcodes
- Compare system vs actual
- Generate discrepancy report
- Approve/reject adjustments
```

### 4. **Enhanced Reporting**

```typescript
// New Reports:

1. Inventory Aging Report
   - Items not sold in 30/60/90 days
   - Slow-moving items
   - Suggest discontinuation

2. Stock Movement Report
   - Daily in/out movements
   - Peak usage times
   - Seasonal trends

3. Supplier Performance
   - On-time delivery %
   - Quality issues
   - Price trends

4. Shrinkage Report
   - Missing inventory value
   - Damage/wastage
   - Potential theft indicators
```

---

## 🔧 Database Enhancements Needed

### Add Purchase Orders Table:

```sql
CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE,
    supplier_id UUID,
    order_date DATE,
    expected_delivery_date DATE,
    status VARCHAR(50), -- draft, sent, received, cancelled
    subtotal DECIMAL(10,2),
    tax DECIMAL(10,2),
    total DECIMAL(10,2),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY,
    po_id UUID REFERENCES purchase_orders(id),
    inventory_item_id UUID REFERENCES inventory_items(id),
    quantity_ordered DECIMAL(10,2),
    quantity_received DECIMAL(10,2),
    unit_cost DECIMAL(10,2),
    line_total DECIMAL(10,2),
    notes TEXT
);
```

### Add Inventory Valuation History:

```sql
CREATE TABLE inventory_valuations (
    id UUID PRIMARY KEY,
    valuation_date DATE,
    total_value DECIMAL(12,2),
    total_items INTEGER,
    total_quantity DECIMAL(12,2),
    created_at TIMESTAMP,
    created_by UUID
);

CREATE TABLE inventory_valuation_items (
    id UUID PRIMARY KEY,
    valuation_id UUID REFERENCES inventory_valuations(id),
    inventory_item_id UUID REFERENCES inventory_items(id),
    quantity DECIMAL(10,2),
    cost_per_unit DECIMAL(10,2),
    total_value DECIMAL(10,2)
);
```

---

## ✅ Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Add all item categories (beverages, food, linens, cleaning)
2. ✅ Manual stock adjustments (for unreported sales)
3. ✅ Date-based inventory valuation
4. ✅ Stock audit workflow

### Phase 2: Important (Do Soon)
1. Purchase order creation
2. Goods receipt
3. Auto-update on receipt
4. Supplier management

### Phase 3: Enhanced (Do Later)
1. Barcode scanning
2. Mobile stock taking app
3. Automated reorder suggestions
4. Predictive analytics

---

## 💡 Key Takeaways

1. **Everything Is Tracked**: Beverages, alcohol, food, linens, pillows, cleaning supplies - EVERYTHING with a cost.

2. **QuickBooks Style**:
   - Inventory Items (tracked)
   - Non-Inventory Items (services, prepared meals)

3. **Closing Stock**: System can calculate inventory value on ANY date for financial reporting.

4. **Unreported Sales**: Manual adjustment workflow to fix discrepancies.

5. **Purchasing**: Purchase orders auto-update inventory when goods received.

6. **Room Supplies**: Full tracking for linens, pillows, amenities, etc.

7. **Alcohol**: Critical tracking with daily reconciliation.

Does this address all your concerns? Should I start implementing these enhancements?
