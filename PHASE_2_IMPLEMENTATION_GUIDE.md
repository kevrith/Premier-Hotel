# Phase 2 Implementation Guide

## Overview
This document provides a complete guide to implementing Phase 2 features for the Premier Hotel Management System.

## Progress Tracker

### ✅ Completed
- Backend API infrastructure (28 endpoints)
- Database schema (7 tables)
- Authentication system
- Basic UI components
- M-Pesa service class (created)

### 🚧 In Progress
- Payment integration endpoints
- Payment UI components

### ⏳ Pending
- Order tracking UI
- Notification system
- Reports dashboard
- Check-in/Check-out UI
- Inventory management
- Staff management
- Housekeeping UI
- Customer feedback

---

## 1. Payment Integration

### Backend (Partially Complete)

**Files Created:**
- ✅ `backend/app/services/mpesa.py` - M-Pesa Daraja API service
- ✅ `backend/app/schemas/payment.py` - Payment schemas
- ✅ Updated `.env` with M-Pesa configuration

**Next Steps:**

#### 1.1 Create Payment Endpoints (`backend/app/api/v1/endpoints/payments.py`)

```python
"""
Payment Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from supabase import Client
from app.core.supabase import get_supabase
from app.schemas.payment import (
    PaymentInitiate,
    MpesaSTKPush,
    PaymentResponse,
    MpesaCallback
)
from app.middleware.auth import get_current_user
from app.services.mpesa import mpesa_service
from datetime import datetime

router = APIRouter()

@router.post("/initiate", response_model=dict)
async def initiate_payment(
    payment_data: PaymentInitiate,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Initiate a payment"""
    if payment_data.payment_method == "mpesa":
        if not payment_data.phone_number:
            raise HTTPException(400, "Phone number required for M-Pesa")

        # Initiate STK push
        result = await mpesa_service.stk_push(
            phone_number=payment_data.phone_number,
            amount=float(payment_data.amount),
            account_reference=payment_data.reference_id,
            transaction_desc=payment_data.description or "Hotel Payment"
        )

        if result["success"]:
            # Store payment record
            payment_record = {
                "reference_type": payment_data.reference_type,
                "reference_id": payment_data.reference_id,
                "payment_method": "mpesa",
                "amount": float(payment_data.amount),
                "status": "pending",
                "checkout_request_id": result.get("checkout_request_id"),
                "merchant_request_id": result.get("merchant_request_id"),
                "customer_id": current_user["id"]
            }

            response = supabase.table("payments").insert(payment_record).execute()

            return {
                "success": True,
                "message": "Payment initiated successfully",
                "payment_id": response.data[0]["id"],
                **result
            }
        else:
            return result

    elif payment_data.payment_method == "cash":
        # Record cash payment as pending confirmation
        payment_record = {
            "reference_type": payment_data.reference_type,
            "reference_id": payment_data.reference_id,
            "payment_method": "cash",
            "amount": float(payment_data.amount),
            "status": "pending_confirmation",
            "customer_id": current_user["id"]
        }

        response = supabase.table("payments").insert(payment_record).execute()

        return {
            "success": True,
            "message": "Cash payment recorded. Pay at reception.",
            "payment_id": response.data[0]["id"]
        }

    elif payment_data.payment_method == "card":
        # Card payment - integrate with payment gateway
        return {
            "success": False,
            "message": "Card payment not yet implemented"
        }


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, supabase: Client = Depends(get_supabase)):
    """Handle M-Pesa callback"""
    data = await request.json()

    # Extract callback data
    body = data.get("Body", {}).get("stkCallback", {})

    checkout_request_id = body.get("CheckoutRequestID")
    result_code = body.get("ResultCode")
    result_desc = body.get("ResultDesc")

    # Update payment status
    update_data = {
        "status": "completed" if result_code == 0 else "failed",
        "result_code": result_code,
        "result_desc": result_desc,
        "completed_at": datetime.utcnow().isoformat()
    }

    if result_code == 0:
        # Success - extract transaction details
        callback_metadata = body.get("CallbackMetadata", {}).get("Item", [])
        for item in callback_metadata:
            if item.get("Name") == "MpesaReceiptNumber":
                update_data["mpesa_receipt"] = item.get("Value")
            elif item.get("Name") == "Amount":
                update_data["amount_paid"] = item.get("Value")
            elif item.get("Name") == "TransactionDate":
                update_data["transaction_date"] = str(item.get("Value"))
            elif item.get("Name") == "PhoneNumber":
                update_data["phone_number"] = item.get("Value")

    # Update database
    supabase.table("payments").update(update_data).eq(
        "checkout_request_id", checkout_request_id
    ).execute()

    return {"ResultCode": 0, "ResultDesc": "Success"}


@router.get("/status/{payment_id}", response_model=PaymentResponse)
async def get_payment_status(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    supabase: Client = Depends(get_supabase),
):
    """Get payment status"""
    response = supabase.table("payments").select("*").eq("id", payment_id).execute()

    if not response.data:
        raise HTTPException(404, "Payment not found")

    payment = response.data[0]

    # Check if user owns this payment
    if payment["customer_id"] != current_user["id"]:
        raise HTTPException(403, "Not authorized")

    return PaymentResponse(**payment)
```

#### 1.2 Add Payments Table to Database

Run this SQL in Supabase:

```sql
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.profiles(id),
    reference_type TEXT NOT NULL CHECK (reference_type IN ('booking', 'order')),
    reference_id UUID NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'cash', 'card')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_confirmation', 'completed', 'failed', 'cancelled')),

    -- M-Pesa specific fields
    checkout_request_id TEXT,
    merchant_request_id TEXT,
    mpesa_receipt TEXT,
    transaction_date TEXT,
    phone_number TEXT,
    result_code INTEGER,
    result_desc TEXT,
    amount_paid DECIMAL(10, 2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX idx_payments_customer ON public.payments(customer_id);
CREATE INDEX idx_payments_reference ON public.payments(reference_type, reference_id);
CREATE INDEX idx_payments_checkout ON public.payments(checkout_request_id);

-- RLS Policies
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = customer_id OR
           EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

CREATE POLICY "Users can create own payments"
    ON public.payments FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### 1.3 Update Router to Include Payment Endpoints

In `backend/app/api/v1/router.py`:

```python
from app.api.v1.endpoints import auth, rooms, bookings, menu, orders, payments

api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
```

### Frontend Implementation

#### 1.4 Create Payment Service (`src/lib/api/services/paymentService.js`)

```javascript
import api from '../client';

const paymentService = {
  // Initiate payment
  initiatePayment: async (paymentData) => {
    const response = await api.post('/payments/initiate', paymentData);
    return response.data;
  },

  // Check payment status
  getPaymentStatus: async (paymentId) => {
    const response = await api.get(`/payments/status/${paymentId}`);
    return response.data;
  },

  // Query M-Pesa transaction status
  queryMpesaStatus: async (checkoutRequestId) => {
    const response = await api.post('/payments/mpesa/query', {
      checkout_request_id: checkoutRequestId
    });
    return response.data;
  },

  // Confirm cash payment (staff only)
  confirmCashPayment: async (paymentId) => {
    const response = await api.post(`/payments/${paymentId}/confirm-cash`);
    return response.data;
  }
};

export default paymentService;
```

#### 1.5 Create Payment Component (`src/components/Payment/PaymentModal.jsx`)

```jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { toast } from 'react-hot-toast';
import paymentService from '@/lib/api/services/paymentService';

const PaymentModal = ({ open, onClose, amount, referenceType, referenceId, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (paymentMethod === 'mpesa' && !phoneNumber) {
      toast.error('Please enter phone number');
      return;
    }

    setIsProcessing(true);

    try {
      const result = await paymentService.initiatePayment({
        payment_method: paymentMethod,
        amount,
        reference_type: referenceType,
        reference_id: referenceId,
        phone_number: paymentMethod === 'mpesa' ? phoneNumber : undefined,
        description: `${referenceType} payment`
      });

      if (result.success) {
        if (paymentMethod === 'mpesa') {
          toast.success('Check your phone for M-Pesa prompt');
          // Poll for payment status
          pollPaymentStatus(result.payment_id);
        } else if (paymentMethod === 'cash') {
          toast.success('Please pay at reception');
          onSuccess(result.payment_id);
        }
      } else {
        toast.error(result.message || 'Payment failed');
      }
    } catch (error) {
      toast.error('Payment initiation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (paymentId) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for 60 seconds

    const poll = setInterval(async () => {
      attempts++;

      try {
        const status = await paymentService.getPaymentStatus(paymentId);

        if (status.status === 'completed') {
          clearInterval(poll);
          toast.success('Payment successful!');
          onSuccess(paymentId);
        } else if (status.status === 'failed') {
          clearInterval(poll);
          toast.error('Payment failed');
        }
      } catch (error) {
        console.error('Error polling payment:', error);
      }

      if (attempts >= maxAttempts) {
        clearInterval(poll);
        toast.error('Payment timeout. Check payment status in your bookings/orders');
      }
    }, 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment - KES {amount.toFixed(2)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Select Payment Method</Label>
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mpesa" id="mpesa" />
                <Label htmlFor="mpesa" className="flex items-center gap-2 cursor-pointer">
                  <Smartphone className="w-4 h-4" />
                  M-Pesa
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                  <Banknote className="w-4 h-4" />
                  Cash (Pay at Reception)
                </Label>
              </div>
              <div className="flex items-center space-x-2 opacity-50">
                <RadioGroupItem value="card" id="card" disabled />
                <Label htmlFor="card" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Card (Coming Soon)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {paymentMethod === 'mpesa' && (
            <div>
              <Label htmlFor="phone">M-Pesa Phone Number</Label>
              <Input
                id="phone"
                placeholder="0712345678 or 254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                You'll receive a prompt on your phone
              </p>
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                Your booking/order will be reserved. Please pay at the reception to confirm.
              </p>
            </div>
          )}

          <Button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Pay Now'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
```

#### 1.6 Integrate Payment into Booking Flow

Update `src/pages/RoomBooking.jsx` to include payment:

```jsx
// Add import
import PaymentModal from '@/components/Payment/PaymentModal';

// Add state
const [showPayment, setShowPayment] = useState(false);
const [bookingId, setBookingId] = useState(null);

// Update handleSubmit to show payment after booking
const handleSubmit = async (e) => {
  e.preventDefault();
  // ... existing booking creation code ...

  // After successful booking:
  setBookingId(result.id);
  setShowPayment(true);
};

// Add PaymentModal component
<PaymentModal
  open={showPayment}
  onClose={() => setShowPayment(false)}
  amount={calculateTotal()}
  referenceType="booking"
  referenceId={bookingId}
  onSuccess={(paymentId) => {
    toast.success('Payment successful!');
    navigate('/my-bookings');
  }}
/>
```

---

## 2. Order Status Tracking UI

### 2.1 Create Order Status Component (`src/components/Orders/OrderStatusTracker.jsx`)

```jsx
import React from 'react';
import { Clock, CheckCircle2, ChefHat, PackageCheck, TruckIcon } from 'lucide-react';

const OrderStatusTracker = ({ status, createdAt, estimatedReadyTime }) => {
  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle2 },
    { key: 'preparing', label: 'Preparing', icon: ChefHat },
    { key: 'ready', label: 'Ready', icon: PackageCheck },
    { key: 'served', label: 'Delivered', icon: TruckIcon }
  ];

  const statusIndex = steps.findIndex(s => s.key === status);

  return (
    <div className="w-full py-4">
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index <= statusIndex;
          const isCurrent = index === statusIndex;

          return (
            <div key={step.key} className="flex-1 relative">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`text-xs mt-2 text-center ${
                  isActive ? 'text-primary font-medium' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>

              {index < steps.length - 1 && (
                <div className="absolute top-5 left-1/2 w-full h-0.5 bg-gray-200">
                  <div
                    className={`h-full transition-all ${
                      index < statusIndex ? 'bg-primary w-full' : 'bg-gray-200 w-0'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {estimatedReadyTime && status !== 'served' && (
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Estimated ready: {new Date(estimatedReadyTime).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default OrderStatusTracker;
```

### 2.2 Create My Orders Page (`src/pages/MyOrders.jsx`)

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import orderService from '@/lib/api/services/orderService';
import OrderStatusTracker from '@/components/Orders/OrderStatusTracker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const MyOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrders();
    // Set up polling for active orders
    const interval = setInterval(loadOrders, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const data = await orderService.getMyOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No orders yet</p>
            <Button onClick={() => navigate('/menu')}>
              Browse Menu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Card key={order.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Order #{order.order_number}</span>
                  <span className="text-lg font-normal">
                    KES {parseFloat(order.total_amount).toFixed(2)}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <OrderStatusTracker
                  status={order.status}
                  createdAt={order.created_at}
                  estimatedReadyTime={order.estimated_ready_time}
                />

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Items:</h4>
                  <ul className="space-y-1">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="text-sm flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>KES {parseFloat(item.price * item.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {order.location && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Delivery to: {order.location}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
```

---

## 3. Notification System

### 3.1 Create Notification Hook (`src/hooks/useNotifications.js`)

```javascript
import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

export const useNotifications = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio('/notification.mp3');
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const showNotification = (title, body, options = {}) => {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo.png',
        ...options
      });
    }

    // Toast notification
    toast.success(body);

    // Sound notification
    if (options.playSound !== false) {
      playSound();
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  return {
    showNotification,
    requestPermission,
    playSound
  };
};
```

---

**(Continued in next section due to length...)**

The guide continues with Reports Dashboard, Check-in/Check-out UI, Inventory Management, Staff Management, Housekeeping, and Customer Feedback.

Would you like me to continue with the remaining sections?
