# 🚀 Quick Start Guide - Phase 2 Payment System

## ⚡ Get Started in 5 Minutes

### Step 1: Create Payments Table (2 minutes)

1. Open your browser and go to:
   ```
   https://supabase.com/dashboard/project/njhjpxfozgpoiqwksple
   ```

2. Click **"SQL Editor"** in the left sidebar

3. Copy and paste the entire contents from:
   ```
   backend/sql/create_payments_table.sql
   ```

4. Click **"Run"** (or press Ctrl+Enter)

5. ✅ Verify: Go to **"Table Editor"** → You should see a new `payments` table

### Step 2: Configure M-Pesa (1 minute)

Open `backend/.env` and update these lines:

```env
# Replace with your actual credentials from https://developer.safaricom.co.ke/
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_PASSKEY=your_passkey_here
```

**Don't have M-Pesa credentials yet?** No problem! You can still test Cash and Card payments.

### Step 3: Start Backend (1 minute)

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# OR: venv\Scripts\activate  # Windows

# Start server
uvicorn app.main:app --reload --port 8000
```

✅ Should see: `Application startup complete` at http://localhost:8000

### Step 4: Start Frontend (1 minute)

```bash
# In project root directory
npm run dev
```

✅ Should open automatically in browser at http://localhost:5173

---

## 🎮 Test It Out!

### Test Payment Flow:

1. **Login** to your account (or register if needed)

2. **Go to My Bookings** (`/my-bookings`)
   - You should see any existing bookings
   - Look for "Pay Now" button if booking is unpaid

3. **Click "Pay Now"**
   - Payment modal appears
   - Choose a payment method:

#### Option A: Test Cash Payment (Easiest)
- Click "Cash" → Click "Confirm Payment"
- ✅ Payment recorded as pending
- Staff can confirm later

#### Option B: Test M-Pesa (If configured)
- Click "M-Pesa"
- Enter phone: `254712345678` (sandbox)
- Click "Confirm Payment"
- ✅ Wait for status update (30-60 seconds)

#### Option C: Test Card Payment
- Click "Credit/Debit Card"
- Enter test card details
- Click "Confirm Payment"
- ✅ Payment marked as pending

### Test Order Tracking:

1. **Go to My Orders** (`/my-orders`)
2. Click **"Track Order"** on any active order
3. ✅ See visual progress with current status
4. ✅ Watch it auto-refresh every 30 seconds

### Test Notifications:

1. When browser asks, click **"Allow"** for notifications
2. Complete a payment
3. ✅ You should see:
   - Browser notification
   - Toast notification
   - Sound alert (if enabled)

---

## 📊 View Your Data

### API Documentation
Visit: http://localhost:8000/docs

Try these endpoints:
- `GET /api/v1/payments/my-payments` - View your payments
- `GET /api/v1/payments/status/{id}` - Check payment status

### Database
Go to Supabase → **Table Editor** → **payments** table

You'll see all payment records with:
- Payment method
- Amount
- Status
- Timestamps
- Transaction IDs

---

## ✅ Success Checklist

- [ ] ✅ Payments table created in Supabase
- [ ] ✅ Backend server running (port 8000)
- [ ] ✅ Frontend running (port 5173)
- [ ] ✅ Can see "Pay Now" button on bookings
- [ ] ✅ Payment modal opens
- [ ] ✅ Can select payment method
- [ ] ✅ Payment records saved to database
- [ ] ✅ Order tracking UI works
- [ ] ✅ Browser notifications enabled

---

## 🆘 Quick Troubleshooting

### "payments table not found"
→ Run the SQL script in Supabase SQL Editor

### "Backend won't start"
→ Check you're in the `backend` directory and venv is activated

### "Frontend won't start"
→ Run `npm install` first

### "Payment not working"
→ Check backend console for errors
→ Verify M-Pesa credentials in `.env`

### "No notifications showing"
→ Click "Allow" when browser asks for permission
→ Check browser notification settings

---

## 📚 Next Steps

Once everything is working:

1. **Read Full Documentation:**
   - `IMPLEMENTATION_SUMMARY.md` - What was built
   - `PHASE_2_COMPLETED.md` - Detailed features
   - `SETUP_INSTRUCTIONS.md` - Complete setup guide

2. **Configure M-Pesa Production:**
   - Get production credentials
   - Update `.env` with production values
   - Test with real phone numbers

3. **Customize:**
   - Add your logo
   - Add notification sounds
   - Adjust colors/styling

4. **Continue with Phase 2:**
   - Build Reports Dashboard
   - Add Staff Management UI
   - Create Inventory Management

---

## 🎉 You're All Set!

Your hotel now has:
- ✅ Complete payment system
- ✅ Real-time order tracking
- ✅ Multi-channel notifications
- ✅ Secure database
- ✅ Modern UI

**Happy coding!** 🚀

---

**Need help?** Check the documentation files or review the code comments.
