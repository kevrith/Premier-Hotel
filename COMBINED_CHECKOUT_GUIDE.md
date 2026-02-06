# Combined Checkout Feature - Complete Guide

## Overview
The Combined Checkout feature allows waiters to process payment for BOTH room accommodation charges AND food/beverage charges in a single transaction, while properly attributing revenue to the correct departments and staff.

## Best Practice Implementation ✅

### Revenue Attribution
- **Room Charges** → Booking revenue (hotel accommodation)
- **F&B Charges** → Food & Beverage revenue (attributed to serving waiter)
- **Payment** → Single transaction, but tracked separately in the system

### Why This Matters
1. **Accounting**: Separate revenue streams for financial reporting
2. **Commission**: Waiters earn commission on F&B sales only
3. **Tax Compliance**: Different tax rates may apply to rooms vs F&B
4. **Performance Tracking**: Management can track room occupancy vs F&B sales separately

## User Flow

### Scenario: Guest Checking Out from Room 305

#### Step 1: Guest Requests Full Checkout
- Guest has stayed in room and ordered room service
- Guest wants to pay everything at once before leaving

#### Step 2: Waiter Accesses Combined Checkout
1. Navigate to Room Service tab in Waiter Dashboard
2. Find the served room service order for Room 305
3. Click **"Full Checkout"** button (appears next to "Process Payment")

#### Step 3: System Fetches Room Folio
System automatically retrieves:
- **Room Charges**: Unpaid accommodation charges from booking
- **F&B Charges**: All unpaid food/beverage bills for that room
- **Total Amount**: Sum of all charges

Example Display:
```
Room 305 Charges:
├── Room Charge: KES 15,000 (3 nights @ KES 5,000/night)
├── F&B Bill #001: KES 2,500 (Breakfast)
├── F&B Bill #002: KES 3,200 (Dinner)
└── Total: KES 20,700
```

#### Step 4: Waiter Processes Payment
1. Select payment method (Cash, M-Pesa, or Card)
2. Enter payment details if needed (phone number for M-Pesa, card ref for Card)
3. Add optional notes
4. Click "Process Payment"

#### Step 5: System Updates Records
**Booking Table:**
- `paid_amount` increased by room charge amount
- `payment_status` updated to 'paid'
- `payment_method` recorded

**Bills Table:**
- All F&B bills marked as 'paid'
- `settled_by_waiter_id` set to current waiter's ID
- `paid_at` timestamp recorded

**Result:**
- Guest receives full payment confirmation
- Waiter gets credit for F&B sales
- Accounting shows proper revenue split

## API Endpoints

### 1. Get Room Folio
```
GET /api/v1/checkout/room-folio/{room_number}
```

**Response:**
```json
{
  "success": true,
  "room_number": "305",
  "booking_id": "uuid-here",
  "room_charge": 15000.00,
  "food_charge": 5700.00,
  "total_amount": 20700.00,
  "items": [
    {
      "type": "room",
      "id": "booking-uuid",
      "description": "Room 305 - 2024-01-15 to 2024-01-18",
      "amount": 15000.00
    },
    {
      "type": "food",
      "id": "bill-uuid-1",
      "description": "F&B Bill BILL-ORD-001",
      "amount": 2500.00
    },
    {
      "type": "food",
      "id": "bill-uuid-2",
      "description": "F&B Bill BILL-ORD-002",
      "amount": 3200.00
    }
  ]
}
```

### 2. Process Combined Checkout
```
POST /api/v1/checkout/combined-checkout
```

**Request:**
```json
{
  "room_number": "305",
  "payment_method": "cash",
  "notes": "Guest paid in full at checkout"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment of KES 20,700.00 processed successfully",
  "total_amount": 20700.00,
  "room_charge": 15000.00,
  "food_charge": 5700.00,
  "booking_id": "booking-uuid",
  "waiter_id": "waiter-uuid"
}
```

## Frontend Components

### WaiterDashboard.tsx Updates

#### New Button for Room Service Orders
```tsx
{order.location_type === 'room' && (
  <Button
    variant="outline"
    onClick={() => {
      setSelectedRoomForCheckout(order.location);
      setShowCombinedCheckoutDialog(true);
    }}
  >
    <Receipt className="h-4 w-4 mr-2" />
    Full Checkout
  </Button>
)}
```

#### CombinedCheckoutDialog Component
- Displays itemized charges breakdown
- Shows room charges vs F&B charges separately
- Supports Cash, M-Pesa, and Card payments
- Real-time total calculation
- Clear attribution notice for waiter

## Database Schema Impact

### Bookings Table
```sql
-- Updated fields during combined checkout
paid_amount DECIMAL(10, 2)      -- Increased by room charge
payment_status TEXT              -- Updated to 'paid'
payment_method TEXT              -- Set to payment method used
updated_at TIMESTAMP             -- Updated to current time
```

### Bills Table
```sql
-- Updated fields during combined checkout
payment_status TEXT              -- Changed from 'unpaid' to 'paid'
paid_at TIMESTAMP                -- Set to current time
settled_by_waiter_id UUID        -- Set to waiter who processed checkout
notes TEXT                       -- Includes payment method and details
```

## Reporting & Analytics

### Revenue Reports
```sql
-- Room Revenue (from bookings)
SELECT SUM(paid_amount) as room_revenue
FROM bookings
WHERE payment_status = 'paid'
AND paid_at BETWEEN '2024-01-01' AND '2024-01-31';

-- F&B Revenue (from bills)
SELECT SUM(total_amount) as fb_revenue
FROM bills
WHERE payment_status = 'paid'
AND paid_at BETWEEN '2024-01-01' AND '2024-01-31';
```

### Waiter Performance
```sql
-- F&B sales by waiter
SELECT 
  u.full_name,
  COUNT(b.id) as bills_settled,
  SUM(b.total_amount) as total_fb_sales
FROM bills b
JOIN users u ON b.settled_by_waiter_id = u.id
WHERE b.payment_status = 'paid'
AND b.paid_at BETWEEN '2024-01-01' AND '2024-01-31'
GROUP BY u.id, u.full_name
ORDER BY total_fb_sales DESC;
```

## Payment Options Comparison

### Option 1: Separate Payments (Old Way)
❌ Guest pays room charge at front desk
❌ Guest pays F&B separately to waiter
❌ Two transactions, more time-consuming
❌ Confusing for guest

### Option 2: Charge to Room (Current)
✅ F&B charges added to room bill
✅ Guest pays everything at checkout
⚠️ But waiter must go to front desk to process

### Option 3: Combined Checkout (NEW - Best Practice)
✅ Waiter can process full checkout
✅ Single transaction for guest
✅ Proper revenue attribution
✅ Waiter gets credit for F&B sales
✅ Faster checkout process
✅ Better guest experience

## Security & Permissions

### Required Permissions
- User must have `waiter`, `manager`, or `admin` role
- Endpoint protected by `require_staff` middleware
- Only active bookings can be checked out

### Validation
- Room must have an active booking
- All charges must be valid and unpaid
- Payment method must be valid
- Room number must exist

## Future Enhancements

1. **Partial Payments**: Allow guest to pay portion now, rest later
2. **Split Payments**: Multiple payment methods in one checkout
3. **Discounts**: Apply discounts during checkout
4. **Loyalty Points**: Redeem points during checkout
5. **Receipt Generation**: Auto-generate PDF receipt
6. **Email Confirmation**: Send receipt to guest email
7. **Commission Calculation**: Auto-calculate waiter commission
8. **Tip Handling**: Add tip field for F&B service

## Testing Checklist

- [ ] Room with only accommodation charges
- [ ] Room with only F&B charges
- [ ] Room with both charges
- [ ] Room with no charges
- [ ] Invalid room number
- [ ] Already paid booking
- [ ] Cash payment processing
- [ ] M-Pesa payment processing
- [ ] Card payment processing
- [ ] Waiter attribution verification
- [ ] Revenue split verification
- [ ] Multiple F&B bills for same room

## Troubleshooting

### Issue: "No outstanding charges for this room"
**Cause**: All charges already paid or no booking found
**Solution**: Verify room number and check if guest already checked out

### Issue: "Failed to fetch room folio"
**Cause**: Database connection issue or invalid room number
**Solution**: Check room number format (should be just number, not "Room 305")

### Issue: F&B charges not attributed to waiter
**Cause**: `settled_by_waiter_id` not being set
**Solution**: Verify waiter is authenticated and ID is in current_user

## Summary

The Combined Checkout feature provides the **best of both worlds**:
- ✅ Guest convenience (single payment)
- ✅ Proper accounting (separate revenue tracking)
- ✅ Fair attribution (waiter gets credit for F&B)
- ✅ Efficient workflow (waiter handles everything)

This is the **industry standard** for hotel POS systems and provides the best experience for both guests and staff.
