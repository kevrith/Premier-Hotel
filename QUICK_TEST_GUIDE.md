# 🚀 Quick Test Guide - Purchase Order System

## Prerequisites ✅

1. ✅ Database migrations run successfully
2. ✅ Backend server ready
3. ✅ Frontend development server ready

---

## Step 1: Start the Backend

```bash
cd /home/kelvin/Desktop/Premier-Hotel/backend
./venv/bin/python3.12 -m uvicorn app.main:app --reload
```

**Expected Output**:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Test Backend**:
Open browser: `http://localhost:8000/docs`

Should see **FastAPI Swagger docs** with new endpoints:
- `/api/v1/purchase-orders/suppliers`
- `/api/v1/purchase-orders/`
- `/api/v1/purchase-orders/dashboard/stats`

---

## Step 2: Start the Frontend

```bash
cd /home/kelvin/Desktop/Premier-Hotel
npm run dev
```

**Expected Output**:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 3: Login as Admin

1. Navigate to: `http://localhost:5173/login`

2. Enter admin credentials:
   - Email: `admin@hotel.com` (or your admin email)
   - Password: (your admin password)

3. Click **Login**

4. You should land on the Admin Dashboard

---

## Step 4: Navigate to Inventory

1. Click the **Inventory** tab

2. You should see a dashboard with:
   - Total Items card
   - Low Stock card
   - Out of Stock card
   - Total Value card

3. Look at the tabs below:
   ```
   [Inventory Items] [Beverages] [Purchase Orders] [Suppliers] [Analytics] [Transactions]
   ```

**If you see "Purchase Orders" and "Suppliers" tabs** → ✅ Frontend is working!

---

## Step 5: Test Supplier Management

1. Click the **Suppliers** tab

2. You should see **5 pre-seeded suppliers**:
   - Kenya Bottlers Ltd (SUP-001)
   - Nairobi Linen Supply (SUP-002)
   - Fresh Foods Ltd (SUP-003)
   - Cleaning Supplies Co (SUP-004)
   - East Africa Breweries (SUP-005)

3. Click **+ Add Supplier**

4. Fill in the form:
   ```
   Name: Test Supplier Ltd
   Contact Person: Jane Doe
   Phone: +254700000000
   Email: jane@testsupplier.co.ke
   Payment Terms: Net 30
   Credit Limit: 100000
   Rating: 4 stars (click on 4th star)
   ```

5. Click **Create Supplier**

6. Should see toast: "Success - Supplier created successfully"

7. New supplier should appear in the grid

**✅ If this works** → Supplier API is connected!

---

## Step 6: Create Your First Purchase Order

1. Click the **Purchase Orders** tab

2. Click **+ New Purchase Order**

3. In the dialog:
   - **Supplier**: Select "Kenya Bottlers Ltd"
   - **Expected Delivery Date**: Select tomorrow's date

4. Click **+ Add Item**

5. Fill in first item:
   - **Product**: Select any inventory item (if none, add one first in Inventory Items tab)
   - **Quantity**: 100
   - **Unit Cost**: 50
   - **Discount %**: 0

6. Click **+ Add Item** again for second item

7. Fill in second item:
   - **Product**: Select different inventory item
   - **Quantity**: 50
   - **Unit Cost**: 80

8. Set financial details:
   - **Tax Amount**: 0 (or calculate 16% if desired)
   - **Shipping Cost**: 500
   - **Overall Discount**: 0

9. Check the **Total Amount** - should calculate automatically

10. Click **Create Purchase Order**

**Expected Result**:
- Toast: "Success - Purchase order created successfully"
- Dialog closes
- New PO appears in table with status "Draft"
- PO Number: PO-2026-0001 (or next number)

**✅ If this works** → PO Creation API is connected!

---

## Step 7: Approve Purchase Order

1. Find your PO in the list (status: Draft)

2. Click the **✓ Approve** button (green checkmark)

3. Confirm if prompted

**Expected Result**:
- Toast: "Success - Purchase order approved successfully"
- Status badge changes from "Draft" to "Approved"
- Approve button disappears
- Send button (📧) appears

**✅ If this works** → PO Approval API is connected!

---

## Step 8: Send to Supplier

1. Click the **📧 Send** button

2. Confirm if prompted

**Expected Result**:
- Toast: "Success - Purchase order sent to supplier"
- Status badge changes to "Sent"
- Send button disappears
- Receive button (📦) appears

**✅ If this works** → PO Send API is connected!

---

## Step 9: Receive Goods (AUTO-UPDATE INVENTORY!)

This is the **MOST IMPORTANT TEST** - the magic auto-inventory update!

### Before Receiving:
1. Go to **Inventory Items** tab
2. Find the items you ordered in the PO
3. **Note down current stock levels**:
   - Item 1: Current stock = ___
   - Item 2: Current stock = ___

### Receive Goods:
1. Go back to **Purchase Orders** tab
2. Click the **📦 Receive** button on your PO

3. In the Receive Goods dialog:
   - You'll see all items from the PO
   - Quantity Received is pre-filled with ordered quantity
   - Quality Status is set to "Good"

4. For testing, let's create a scenario:
   - **Item 1**: Received = 100, Quality = Good
   - **Item 2**: Received = 48, Quality = Good
   - **Item 2** (add another row mentally): Received = 2, Quality = Damaged, Notes = "Broken in transit"

5. Check the summary cards:
   - Good Items: Should show 148 (100 + 48)
   - Damaged: Should show 2

6. Set:
   - **Inspection Status**: Partial
   - **Quality Notes**: "2 items damaged during delivery"

7. Click **Complete Receipt & Update Inventory**

**Expected Result**:
- Toast: "Success - Goods received successfully. Inventory has been updated automatically."
- Dialog closes
- PO status changes to "Received"

### VERIFY AUTO-UPDATE:
1. Go to **Inventory Items** tab
2. Find the same items
3. **Check stock levels**:
   - Item 1: Current stock should be (old value + 100) ✅
   - Item 2: Current stock should be (old value + 48) ✅ (NOT +50, because 2 were damaged)

**✅ If stock auto-increased** → 🎉 FULL SYSTEM WORKING!

---

## Step 10: Check Dashboard

1. Click **Analytics** tab

2. You should see:
   - **Total Purchase Orders**: 1 (or more)
   - **Received**: 1 (your completed PO)
   - **Total PO Value**: Your PO amount
   - **Pending Deliveries**: Empty (since you received it)

**✅ If stats show** → Dashboard API is connected!

---

## Step 11: View PO Details

1. Go to **Purchase Orders** tab
2. Find any PO
3. Click the **👁 View** button

**Expected Result**:
- Dialog opens showing:
  - Supplier information
  - Order dates
  - All items with quantities
  - Financial summary
  - Notes

**✅ If details show** → View API is connected!

---

## 🎉 Success Criteria

If all steps above work:

✅ Backend API is running
✅ Frontend is connected to backend
✅ Supplier management works
✅ Purchase order creation works
✅ Approval workflow works
✅ Send to supplier works
✅ **Auto-inventory update works** (MOST IMPORTANT!)
✅ Dashboard statistics work
✅ View details works

**YOU HAVE A FULLY FUNCTIONAL ENTERPRISE PURCHASE ORDER SYSTEM!** 🚀

---

## 🐛 Troubleshooting

### Issue: Can't see Purchase Orders tab
**Fix**: Make sure you're logged in as Admin and on the Inventory section

### Issue: "Network Error" when creating PO
**Fix**:
1. Check backend is running: `http://localhost:8000/docs`
2. Check console for CORS errors
3. Verify API_URL in frontend .env file

### Issue: Inventory not auto-updating
**Fix**:
1. Check backend logs for errors
2. Make sure you selected "Good" quality status
3. Verify inventory items exist in database
4. Check console for API errors

### Issue: "Failed to load suppliers"
**Fix**:
1. Check database migrations ran successfully
2. Run: `psql -h [db_host] -U [user] -d [db_name] -c "SELECT * FROM suppliers;"`
3. Should see 5 suppliers

### Issue: No inventory items to select
**Fix**:
1. Go to Inventory Items tab
2. Add sample inventory items first
3. Then create PO

---

## 📞 Need Help?

If something doesn't work:

1. **Check backend logs** - Look for error messages
2. **Check browser console** (F12) - Look for JavaScript errors
3. **Check Network tab** - See which API calls are failing
4. **Verify database** - Make sure all migrations ran

---

**Happy Testing! 🎊**

The system is production-ready and should work flawlessly!
