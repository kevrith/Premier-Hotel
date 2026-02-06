# Room Service Payment Guide

## Overview
Room service orders now support multiple payment methods including the ability to charge directly to the guest's room.

## Payment Methods

### For Room Service Orders:
1. **Charge to Room** (Default for room service)
   - Charges are added to the guest's room bill
   - Payment will be collected at checkout
   - Bill status: `unpaid` until checkout

2. **Cash Payment**
   - Guest pays immediately with cash
   - Bill status: `paid`

3. **M-Pesa Payment**
   - Guest pays via M-Pesa STK push
   - Bill status: `paid`

4. **Card Payment**
   - Guest pays with credit/debit card
   - Bill status: `paid`

### For Table Orders:
- Cash, M-Pesa, and Card only
- No "Charge to Room" option

## Important Notes

### What's Included in Room Service Charges?
- **ONLY food and beverage items** from the order
- **Room accommodation charges are separate** and handled through the bookings system
- Room charges are paid at checkout, not when food is delivered

### Workflow

#### Room Service with "Charge to Room":
1. Guest orders food to their room
2. Chef prepares the order
3. Waiter delivers to room and marks as "Served"
4. Waiter selects "Charge to Room" payment method
5. Charge is added to guest's room folio (bill)
6. Guest pays all charges (room + food) at checkout

#### Room Service with Immediate Payment:
1. Guest orders food to their room
2. Chef prepares the order
3. Waiter delivers to room and marks as "Served"
4. Waiter selects Cash/M-Pesa/Card
5. Guest pays immediately
6. Order is completed

## Database Changes

### Orders Table
- No changes needed (already has `location_type` and `location` fields)

### Bills Table
- `payment_status`: Can be 'paid' or 'unpaid'
- `paid_at`: NULL for room charges, timestamp for immediate payments
- `room_number`: Stores the room number for room service orders
- `notes`: Includes payment method information

## Frontend Changes

### WaiterDashboard.tsx
- Added "Charge to Room" payment option for room service orders
- Payment dialog shows 4 tabs for room service (Room, Cash, M-Pesa, Card)
- Payment dialog shows 3 tabs for table orders (Cash, M-Pesa, Card)
- Default payment method for room service is "Charge to Room"

### orderPayments.ts API
- Updated `OrderPaymentRequest` to include `room_charge` payment method
- Added `room_number` field for room charge tracking

## Backend Changes

### order_payments.py
- Added support for `room_charge` payment method
- Bills created with `payment_status: 'unpaid'` for room charges
- Bills created with `payment_status: 'paid'` for immediate payments
- Success message indicates whether charge was added to room or paid immediately

## Future Enhancements

1. **Link orders to bookings** - Add `booking_id` to orders table
2. **Guest folio view** - Show all charges (room + food + services) in one place
3. **Checkout integration** - Automatically include unpaid bills in checkout process
4. **Room charge limits** - Set maximum charge limits per room
5. **Authorization** - Require room key or guest signature for room charges
