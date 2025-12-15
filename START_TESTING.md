# 🚀 Quick Start Testing

## Step-by-Step Testing Instructions

### 📋 Pre-Requirements
- ✅ Supabase project is set up
- ✅ Backend dependencies installed
- ✅ Frontend dependencies installed

---

## 🎯 Step 1: Setup Database (2 minutes)

### Create Payments Table

1. **Open Supabase:**
   ```
   https://supabase.com/dashboard/project/njhjpxfozgpoiqwksple
   ```

2. **Go to SQL Editor** (left sidebar)

3. **Click "New Query"**

4. **Copy ALL lines from:**
   ```
   backend/sql/create_payments_table_fixed.sql
   ```

5. **Paste and Click "Run"**

6. **Verify Success:**
   - Go to "Table Editor"
   - You should see `payments` table with 8 tables total

---

## 🎯 Step 2: Start Backend (1 minute)

```bash
# Terminal 1 - Backend
cd backend

# Activate virtual environment
source venv/bin/activate

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

**✅ Success Check:**
- Server says: "Application startup complete"
- Visit: http://localhost:8000/docs
- You should see Swagger UI with 36 endpoints

---

## 🎯 Step 3: Start Frontend (1 minute)

```bash
# Terminal 2 - Frontend (new terminal)
cd /home/kelvin/Desktop/Premier-Hotel

# Start React dev server
npm run dev
```

**✅ Success Check:**
- Browser opens automatically at http://localhost:5173
- You see the hotel website

---

## 🎯 Step 4: Test Payments (5 minutes)

### Test Cash Payment

1. **Login** to your account
2. **Go to "My Bookings"**
3. Find a booking (create one if needed)
4. **Click "Pay Now"**
5. **Select "Cash"**
6. **Click "Confirm Payment"**

**✅ Expected:**
- Modal opens ✓
- Payment recorded ✓
- Toast: "Cash payment recorded" ✓

### Test Card Payment

1. **Click "Pay Now"** on another booking/order
2. **Select "Credit/Debit Card"**
3. **Enter test data:**
   - Card: `4111 1111 1111 1111`
   - Expiry: `12/25`
   - CVV: `123`
4. **Click "Confirm Payment"**

**✅ Expected:**
- Card form works ✓
- Payment recorded ✓
- Toast: "Card payment initiated" ✓

---

## 🎯 Step 5: Test Order Tracking (3 minutes)

1. **Go to "My Orders"** (`/my-orders`)
2. If no orders, place one from Menu
3. **Click "Track Order"** on an active order

**✅ Expected:**
- Tracking modal opens ✓
- Shows 6-stage progress ✓
- Current stage animated ✓
- Auto-refreshes every 30s ✓

---

## 🎯 Step 6: Test Reports Dashboard (5 minutes)

### Access Dashboard

1. **Make sure you're logged in as staff/admin**
2. **Navigate to:** `/reports`

**✅ Expected:**
- Dashboard loads ✓
- Shows 4 stat cards ✓

### Test Period Selection

1. **Change period:** Today → Week → Month → Year
2. **Click each tab:** Revenue, Bookings, Orders

**✅ Expected:**
- Data updates for each period ✓
- Charts display correctly ✓
- No errors in console ✓

---

## 🎯 Step 7: Test Notifications (2 minutes)

1. **When browser asks, click "Allow"** for notifications
2. **Complete a payment**

**✅ Expected:**
- Browser notification appears ✓
- Toast notification appears ✓
- (Sound plays if files exist) ✓

---

## 🎯 Step 8: Verify Database (2 minutes)

### Check Payments in Supabase

1. **Go to Table Editor**
2. **Click on `payments` table**
3. **View recent records**

**✅ Expected:**
- See your test payments ✓
- Status shows "pending" ✓
- All fields populated ✓
- Timestamps set ✓

---

## 🐛 Quick Troubleshooting

### Backend Won't Start
```bash
# Make sure you're in backend directory
cd backend

# Check if venv is activated
which python
# Should show: /path/to/backend/venv/bin/python

# Try reinstalling
pip install -r requirements.txt
```

### Frontend Won't Start
```bash
# Install dependencies
npm install

# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

### Payments Table Error
```
Error: relation "public.payments" does not exist
```
**Solution:** Run the SQL script again in Supabase

### Reports Access Denied
```
Error: You do not have permission
```
**Solution:**
1. Check your user role in Supabase `users` table
2. Role must be: `admin`, `manager`, or `staff`
3. Update if needed:
   ```sql
   UPDATE auth.users
   SET raw_user_meta_data = jsonb_set(
     raw_user_meta_data,
     '{role}',
     '"admin"'
   )
   WHERE id = 'your-user-id';
   ```

---

## ✅ Testing Checklist

### Core Features
- [ ] Backend running (http://localhost:8000/docs)
- [ ] Frontend running (http://localhost:5173)
- [ ] Payments table created in Supabase
- [ ] Can login to account

### Payment System
- [ ] Cash payment works
- [ ] Card payment works
- [ ] Payment status displays
- [ ] Toast notifications work
- [ ] Database records payments

### Order System
- [ ] MyOrders page loads
- [ ] Can track orders
- [ ] Status indicator works
- [ ] Auto-refresh works

### Reports Dashboard
- [ ] Can access /reports (as staff)
- [ ] Overview stats display
- [ ] Revenue tab works
- [ ] Bookings tab works
- [ ] Orders tab works
- [ ] Period selector works

### Notifications
- [ ] Browser notifications work
- [ ] Toast notifications work
- [ ] No errors in console

---

## 🎉 All Tests Pass?

### Next Steps:

**Option 1: Continue Development (Phase 3)**
- Staff Management UI
- Inventory Management
- Housekeeping System
- Customer Reviews

**Option 2: Production Deployment**
- Configure production M-Pesa
- Set up hosting (Vercel/Railway)
- Configure production database
- Set up monitoring

**Option 3: Add More Features**
- Email notifications
- PDF reports export
- Advanced charts
- Mobile app

---

## 📚 Documentation Files

- `TESTING_GUIDE.md` - Comprehensive testing guide
- `PHASE_2_FINAL_SUMMARY.md` - Complete feature list
- `SETUP_INSTRUCTIONS.md` - Detailed setup guide
- `QUICK_START.md` - 5-minute quick start

---

## 💬 Need Help?

Check these files:
1. Backend logs (Terminal 1)
2. Frontend console (Browser DevTools)
3. Supabase logs (Dashboard → Logs)
4. Network tab for API calls

---

**Happy Testing! 🚀**

Everything is ready to go. Just follow the steps above!
