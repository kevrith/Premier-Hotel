# 🧪 Complete Testing Guide - Phase 2

## Pre-Testing Setup

### ✅ Step 1: Create Payments Table

1. Open Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/njhjpxfozgpoiqwksple
   ```

2. Go to **SQL Editor** → Click **"New Query"**

3. Copy and paste from:
   ```
   backend/sql/create_payments_table_fixed.sql
   ```

4. Click **"Run"**

5. Verify: Go to **Table Editor** → You should see `payments` table

### ✅ Step 2: Start Backend

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac

# Start server
uvicorn app.main:app --reload --port 8000
```

**Expected**: Server starts at http://localhost:8000

### ✅ Step 3: Start Frontend

```bash
# In project root
npm run dev
```

**Expected**: Frontend opens at http://localhost:5173

---

## 🧪 Testing Checklist

### Part 1: Payment System Testing

#### Test 1.1: Cash Payment ✅

**Steps:**
1. Login to your account
2. Go to **"My Bookings"** (`/my-bookings`)
3. Find a booking with "Pending" payment status
4. Click **"Pay Now"** button
5. Payment modal opens
6. Select **"Cash"** payment method
7. Click **"Confirm Payment"**

**Expected Results:**
- ✅ Payment modal appears
- ✅ Cash option is selectable
- ✅ Shows message: "Please proceed to the front desk"
- ✅ Payment recorded as "pending" in database
- ✅ Toast notification: "Cash payment recorded"
- ✅ Booking payment status remains "Pending" (until staff confirms)

**Verify in Database:**
```sql
SELECT * FROM payments
WHERE payment_method = 'cash'
ORDER BY created_at DESC
LIMIT 5;
```

#### Test 1.2: Card Payment ✅

**Steps:**
1. Go to **"My Bookings"**
2. Click **"Pay Now"** on another booking
3. Select **"Credit/Debit Card"**
4. Fill in card details:
   - Card Number: `4111 1111 1111 1111` (test card)
   - Expiry: `12/25`
   - CVV: `123`
5. Click **"Confirm Payment"**

**Expected Results:**
- ✅ Card form appears with all fields
- ✅ Input validation works
- ✅ Payment recorded as "pending"
- ✅ Toast notification: "Card payment initiated"
- ✅ Payment status: "Pending" (awaiting gateway confirmation)

**Verify in Database:**
```sql
SELECT * FROM payments
WHERE payment_method = 'card'
ORDER BY created_at DESC
LIMIT 5;
```

#### Test 1.3: M-Pesa Payment (Skip - No Credentials)

**Note**: M-Pesa requires Daraja API credentials. This test can be skipped for now.

When you have credentials:
- Phone number validation works
- STK Push initiates (sandbox)
- Payment polling mechanism works
- Status updates automatically

---

### Part 2: Order Payment Testing

#### Test 2.1: View Orders Page

**Steps:**
1. Go to **"My Orders"** (`/my-orders`)

**Expected Results:**
- ✅ Page loads without errors
- ✅ Shows empty state if no orders (with "Browse Menu" button)
- ✅ Shows orders list if orders exist
- ✅ Each order shows:
  - Order number
  - Status badge
  - Items list
  - Total amount
  - Payment status
  - Actions (Track Order, Pay Now)

#### Test 2.2: Order Payment

**Steps:**
1. On an order with unpaid status
2. Click **"Pay Now"**
3. Select **"Cash"** or **"Card"**
4. Complete payment

**Expected Results:**
- ✅ Payment modal opens
- ✅ Shows correct order amount
- ✅ Payment processes successfully
- ✅ Order payment status updates

---

### Part 3: Order Tracking Testing

#### Test 3.1: Track Order

**Steps:**
1. On **"My Orders"** page
2. Find an active order (pending, preparing, ready, delivering)
3. Click **"Track Order"** button

**Expected Results:**
- ✅ Tracking modal opens
- ✅ Shows 6-stage progress indicator:
  - Order Placed
  - Confirmed
  - Preparing
  - Ready
  - Delivering
  - Delivered
- ✅ Current stage is highlighted and animated
- ✅ Completed stages are green
- ✅ Pending stages are gray
- ✅ Shows estimated time (if available)

#### Test 3.2: Auto-Refresh

**Steps:**
1. Keep tracking modal open for 30+ seconds

**Expected Results:**
- ✅ Shows "Updating..." indicator every 30 seconds
- ✅ Status refreshes automatically
- ✅ No errors in console

---

### Part 4: Notification System Testing

#### Test 4.1: Browser Notifications

**Steps:**
1. When browser asks for permission, click **"Allow"**
2. Complete a payment

**Expected Results:**
- ✅ Browser notification appears
- ✅ Shows payment success message
- ✅ Notification has hotel logo/icon

**If Blocked:**
- Check browser notification settings
- Try in Chrome/Firefox (better support)

#### Test 4.2: Sound Alerts

**Steps:**
1. Complete a payment or order action
2. Listen for notification sound

**Expected Results:**
- ✅ Sound plays (if sound file exists)
- ✅ No sound if disabled in settings

**Note**: Sound files need to be added to `public/sounds/` folder

#### Test 4.3: Toast Notifications

**Steps:**
1. Perform any action (payment, order, booking)

**Expected Results:**
- ✅ Toast notification appears (always works)
- ✅ Shows appropriate icon and color
- ✅ Auto-dismisses after few seconds
- ✅ Can be manually dismissed

#### Test 4.4: Notification Settings

**Steps:**
1. Access notification settings (if added to user profile)
2. Toggle notification preferences

**Expected Results:**
- ✅ Settings save to localStorage
- ✅ Preferences are respected
- ✅ Can enable/disable each notification type

---

### Part 5: Reports Dashboard Testing

#### Test 5.1: Access Dashboard

**Steps:**
1. Login as **admin**, **manager**, or **staff**
2. Navigate to `/reports`

**Expected Results:**
- ✅ Dashboard loads
- ✅ Shows 4 stat cards:
  - Total Revenue
  - Active Customers
  - Bookings count
  - Orders count
- ✅ Period selector works (Today/Week/Month/Year)

**If Access Denied:**
- Verify user role in database
- Check user is logged in
- Role must be: admin, manager, or staff

#### Test 5.2: Revenue Tab

**Steps:**
1. Click **"Revenue"** tab
2. Select different time periods

**Expected Results:**
- ✅ Revenue trend chart displays
- ✅ Shows daily revenue bars
- ✅ Revenue summary card shows:
  - Total revenue
  - Transaction count
  - Average transaction value
- ✅ Data updates when period changes

#### Test 5.3: Bookings Tab

**Steps:**
1. Click **"Bookings"** tab

**Expected Results:**
- ✅ Shows bookings summary:
  - Total bookings
  - Total revenue
  - Average booking value
  - Average stay duration
- ✅ Shows distribution by room type
- ✅ Shows distribution by status

#### Test 5.4: Orders Tab

**Steps:**
1. Click **"Orders"** tab

**Expected Results:**
- ✅ Shows orders summary:
  - Total orders
  - Total revenue
  - Average order value
  - Completion rate
- ✅ Shows distribution by status
- ✅ Shows top selling items (if data exists)

#### Test 5.5: Period Selection

**Steps:**
1. Change period from dropdown:
   - Today
   - Last 7 Days
   - Last 30 Days
   - Last Year

**Expected Results:**
- ✅ Data refreshes for each period
- ✅ Metrics update correctly
- ✅ Charts adjust to new data
- ✅ No errors in console

---

### Part 6: API Testing (Backend)

#### Test 6.1: API Documentation

**Steps:**
1. Open browser
2. Go to: `http://localhost:8000/docs`

**Expected Results:**
- ✅ Swagger UI loads
- ✅ Shows all 36 endpoints organized by tags:
  - Authentication (10)
  - Rooms (7)
  - Bookings (8)
  - Menu (5)
  - Orders (8)
  - Payments (8)
  - Reports (5)

#### Test 6.2: Test Payment Endpoint

**Steps:**
1. In Swagger UI, go to **"Payments"** section
2. Click `POST /api/v1/payments/initiate`
3. Click **"Try it out"**
4. Fill in test data:
   ```json
   {
     "payment_method": "cash",
     "amount": 1000,
     "reference_type": "booking",
     "reference_id": "your-booking-id",
     "description": "Test payment"
   }
   ```
5. Add your JWT token in Authorization
6. Click **"Execute"**

**Expected Results:**
- ✅ Returns 200 OK
- ✅ Returns payment object with ID
- ✅ Status is "pending"
- ✅ Created_at timestamp is set

#### Test 6.3: Test Reports Endpoint

**Steps:**
1. In Swagger UI, go to **"Reports"** section
2. Click `GET /api/v1/reports/overview`
3. Click **"Try it out"**
4. Add JWT token (must be staff/admin)
5. Click **"Execute"**

**Expected Results:**
- ✅ Returns 200 OK
- ✅ Returns overview object with metrics
- ✅ Shows revenue, bookings, orders stats
- ✅ Data is accurate

---

### Part 7: Database Verification

#### Test 7.1: Verify Payments Table

```sql
-- Check table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payments';

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'payments';

-- View recent payments
SELECT * FROM payments
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results:**
- ✅ Table has all columns (id, user_id, amount, status, etc.)
- ✅ RLS is enabled (rowsecurity = true)
- ✅ Payments are being recorded

#### Test 7.2: Check Indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'payments';
```

**Expected Results:**
- ✅ 5 indexes exist:
  - idx_payments_user_id
  - idx_payments_reference
  - idx_payments_status
  - idx_payments_mpesa_checkout
  - idx_payments_created_at

#### Test 7.3: Test RLS Policies

```sql
-- As a customer, should only see own payments
-- This should return only your payments
SELECT * FROM payments;

-- As staff (using service_role), should see all
-- Use Supabase SQL editor with service_role
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Payments table not found"
**Solution**: Run the SQL script in Supabase SQL Editor

### Issue 2: "Access denied" on reports
**Solution**:
- Check user role in database
- Ensure role is: admin, manager, or staff
- Verify JWT token is valid

### Issue 3: Payment modal doesn't open
**Solution**:
- Check browser console for errors
- Verify PaymentModal component exists
- Check import paths

### Issue 4: No notifications appearing
**Solution**:
- Click "Allow" when browser asks
- Check browser notification settings
- Use Chrome or Firefox (better support)

### Issue 5: Reports show no data
**Solution**:
- Create test bookings and orders first
- Make some test payments
- Ensure date range includes data
- Check backend console for errors

### Issue 6: CORS errors
**Solution**:
- Backend CORS is already configured
- Frontend should be on port 5173
- Backend should be on port 8000

---

## ✅ Testing Success Criteria

### Payments
- [ ] Cash payment records successfully
- [ ] Card payment records successfully
- [ ] Payment status displays correctly
- [ ] Database updates properly
- [ ] Toast notifications work

### Orders
- [ ] MyOrders page loads
- [ ] Order tracking modal works
- [ ] Status indicator animates
- [ ] Auto-refresh works
- [ ] Payment integration works

### Notifications
- [ ] Browser notifications work (if permitted)
- [ ] Toast notifications always work
- [ ] Settings save correctly

### Reports
- [ ] Dashboard loads for staff
- [ ] All 4 stat cards display
- [ ] Revenue tab shows data
- [ ] Bookings tab shows data
- [ ] Orders tab shows data
- [ ] Period selector works
- [ ] Charts render correctly

### API
- [ ] All 36 endpoints documented
- [ ] Payment endpoints work
- [ ] Reports endpoints work
- [ ] Authentication works
- [ ] Authorization works

### Database
- [ ] Payments table created
- [ ] RLS policies active
- [ ] Indexes created
- [ ] Data persists correctly

---

## 📊 Test Data Creation

If you need test data for reports:

### Create Test Booking
1. Go to Rooms page
2. Select a room
3. Make a booking
4. Complete payment (cash/card)

### Create Test Order
1. Go to Menu page
2. Add items to cart
3. Place order
4. Complete payment

### Create Multiple Payments
Repeat booking/order process with different:
- Payment methods (cash, card)
- Amounts
- Dates

This will populate your reports dashboard!

---

## 🎉 Testing Complete!

Once all tests pass, you're ready for:
- ✅ Production deployment
- ✅ Real user testing
- ✅ Phase 3 development

---

**Testing Date:** December 2025
**System Status:** Ready for Testing
**Next Step:** Run through this checklist systematically
