# Setup Instructions - Phase 2 Payment System

## 🗄️ Database Setup

### Step 1: Create Payments Table in Supabase

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/njhjpxfozgpoiqwksple
   - Navigate to **SQL Editor** (left sidebar)

2. **Execute the SQL Script**
   - Copy the entire contents from: `backend/sql/create_payments_table.sql`
   - Paste into the SQL Editor
   - Click **"Run"** or press `Ctrl+Enter`

3. **Verify Table Creation**
   - Go to **Table Editor** (left sidebar)
   - You should see a new `payments` table
   - Check that it has 8 tables total (users, bookings, rooms, menu_items, orders, order_items, reviews, payments)

### Quick Verification Queries

After running the script, verify with these queries:

```sql
-- Check if table exists
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'payments';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'payments';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'payments';
```

## 🔧 Backend Configuration

### Step 2: Configure M-Pesa Daraja API

1. **Get M-Pesa Credentials**
   - Go to: https://developer.safaricom.co.ke/
   - Sign up / Login
   - Create a new app
   - Note down:
     - Consumer Key
     - Consumer Secret
     - Lipa Na M-Pesa Online Passkey

2. **Update Backend .env File**

   Open `backend/.env` and update these values:

   ```env
   # M-Pesa Configuration (Daraja API)
   MPESA_ENVIRONMENT=sandbox
   MPESA_CONSUMER_KEY=your_consumer_key_from_daraja
   MPESA_CONSUMER_SECRET=your_consumer_secret_from_daraja
   MPESA_SHORTCODE=174379
   MPESA_PASSKEY=your_passkey_from_daraja
   MPESA_CALLBACK_URL=http://localhost:8000/api/v1/payments/mpesa/callback
   ```

3. **For Production (later)**
   - Change `MPESA_ENVIRONMENT=production`
   - Update shortcode to your production shortcode
   - Update callback URL to your production domain

### Step 3: Setup M-Pesa Callback URL (for testing)

For local testing, M-Pesa needs a publicly accessible callback URL:

**Option 1: Using ngrok (Recommended for testing)**
```bash
# Install ngrok
# Download from: https://ngrok.com/download

# Run ngrok
ngrok http 8000

# Copy the https URL (e.g., https://abc123.ngrok.io)
# Update MPESA_CALLBACK_URL in .env to:
# MPESA_CALLBACK_URL=https://abc123.ngrok.io/api/v1/payments/mpesa/callback
```

**Option 2: Using Supabase Edge Functions (Production)**
- Deploy callback handler as an edge function
- Point M-Pesa to the edge function URL

## 🎨 Frontend Setup (Optional)

### Step 4: Add Notification Sounds

Create sound files in `public/sounds/`:

```bash
mkdir -p public/sounds
```

Add these audio files (you can download free notification sounds):
- `notification.mp3` - Default notification sound
- `success.mp3` - Success notification sound
- `error.mp3` - Error notification sound

**Free Sound Resources:**
- https://notificationsounds.com/
- https://mixkit.co/free-sound-effects/notification/
- https://freesound.org/

### Step 5: Ensure Logo Exists

Make sure you have `/public/logo.png` for browser notifications icon.

## 🚀 Starting the Application

### Backend (FastAPI)

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies (if not already done)
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

Server should start at: http://localhost:8000
API docs at: http://localhost:8000/docs

### Frontend (React)

```bash
cd Premier-Hotel  # or your project root

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

Frontend should start at: http://localhost:5173 (or the port shown in terminal)

## ✅ Testing the Payment System

### Test M-Pesa Payment (Sandbox)

1. **Create a Test Booking or Order**
   - Navigate to the bookings or menu page
   - Make a booking or place an order

2. **Initiate Payment**
   - Go to "My Bookings" or "My Orders"
   - Click "Pay Now" button
   - Select "M-Pesa"
   - Enter test phone number: `254712345678`

3. **M-Pesa Test Numbers (Sandbox)**
   - Any number starting with 2547XXXXXXXX works in sandbox
   - You won't receive actual STK push (it's simulated)
   - Callback will return success after ~30 seconds

### Test Cash Payment

1. Click "Pay Now"
2. Select "Cash"
3. Payment marked as pending
4. Staff can confirm via admin panel

### Test Card Payment

1. Click "Pay Now"
2. Select "Card"
3. Enter test card details
4. Payment marked as pending (gateway integration needed for actual processing)

## 📊 Monitor Payments

### View in Database
```sql
-- View all payments
SELECT * FROM payments ORDER BY created_at DESC;

-- View successful payments
SELECT * FROM payments WHERE status = 'completed';

-- View pending payments
SELECT * FROM payments WHERE status = 'pending';
```

### API Endpoints
- View your payments: `GET /api/v1/payments/my-payments`
- Check payment status: `GET /api/v1/payments/status/{payment_id}`
- View all payments (staff): `GET /api/v1/payments/all`

## 🔍 Troubleshooting

### Payment Table Not Created
- Make sure you're connected to the correct Supabase project
- Check for SQL errors in the Supabase SQL editor
- Verify you have the `uuid_generate_v4()` extension enabled

### M-Pesa Not Working
- Verify credentials in `.env`
- Check if callback URL is publicly accessible
- View M-Pesa logs in Daraja dashboard
- Check backend console for errors

### Browser Notifications Not Showing
- Click "Allow" when browser asks for notification permission
- Check notification settings in browser
- Ensure site is served over HTTPS (or localhost)

### Payment Status Not Updating
- Check if callback URL is reachable
- View payment status in database directly
- Check backend logs for callback errors
- M-Pesa callbacks can take 30-60 seconds

## 🔐 Security Notes

1. **Never commit `.env` file** - Already in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Rotate M-Pesa credentials** regularly in production
4. **Enable RLS policies** - Already configured in SQL script
5. **Use HTTPS** in production
6. **Validate callback signatures** in production (implement webhook signing)

## 📱 M-Pesa Production Checklist

When going to production:

- [ ] Apply for M-Pesa Go-Live
- [ ] Get production credentials
- [ ] Update `MPESA_ENVIRONMENT=production`
- [ ] Use production shortcode and passkey
- [ ] Set up production callback URL (must be HTTPS)
- [ ] Implement webhook signature verification
- [ ] Test with real phone numbers
- [ ] Monitor transaction logs
- [ ] Set up error alerting

## 🎯 Next Steps

After payment system is working:

1. ✅ Test all payment methods
2. ✅ Verify payment status updates
3. ✅ Test order tracking UI
4. ✅ Configure notification preferences
5. 🔲 Implement Reports Dashboard (next major feature)
6. 🔲 Build Staff Management UI
7. 🔲 Create Inventory Management UI

## 💬 Support

If you encounter issues:

1. Check backend console logs
2. Check browser console for errors
3. Verify database connections
4. Review API documentation at `/docs`
5. Check M-Pesa Daraja documentation
6. Review `PHASE_2_COMPLETED.md` for implementation details

## 📚 Documentation Links

- **Supabase**: https://supabase.com/docs
- **M-Pesa Daraja**: https://developer.safaricom.co.ke/Documentation
- **FastAPI**: https://fastapi.tiangolo.com/
- **React**: https://react.dev/

---

**Setup Date:** December 2025
**Version:** Phase 2 - Payment System
**Status:** Ready for Testing
