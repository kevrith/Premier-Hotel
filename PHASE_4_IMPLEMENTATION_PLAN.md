# Phase 4: Integration & Communication - Implementation Plan

## Overview
Phase 4 focuses on enhancing integrations and enabling real-time communication to complete the MVP. This phase builds on the existing M-Pesa integration from Phase 2 and notification system from Phase 3.

**Status:** Planning
**Duration:** To be determined
**Priority:** High - Completes MVP

---

## Alignment with Existing Implementation

### Already Implemented ✅
From Phase 2:
- ✅ M-Pesa Daraja API integration (STK Push, callbacks)
- ✅ Payment processing (M-Pesa, Cash, Card)
- ✅ Payment status tracking
- ✅ Browser notifications
- ✅ Sound alerts
- ✅ Toast notifications
- ✅ Notification preferences

From Phase 3:
- ✅ Backend notification tables (7 tables)
- ✅ Notification API endpoints
- ✅ Multi-channel notification schema (email/SMS/push/in-app)
- ✅ Notification templates system
- ✅ Notification preferences management

### What Phase 4 Will Add 🚀
1. **Activate Email/SMS Services** - Make notification system functional
2. **Real-time Updates** - WebSocket for live data
3. **Enhanced Payment Integration** - Expand beyond M-Pesa
4. **Communication Platform** - Staff-guest messaging

---

## Phase 4 Features

### Feature 1: Email Service Integration ⭐ Priority
**Goal:** Send actual emails for bookings, payments, notifications

**Implementation:**
- Email service provider integration (SendGrid/AWS SES/Mailgun)
- Email template system with branding
- Automated email triggers
- Email queue processing
- Email delivery tracking

**Use Cases:**
- Booking confirmation emails
- Payment receipt emails
- Password reset emails
- Order confirmation emails
- Notification emails
- Promotional emails

**Technical Approach:**
```python
# Use existing notification_templates table
# Process email_queue table from Phase 3
# Backend service for email sending
```

**Files to Create:**
- `backend/app/services/email_service.py`
- `backend/app/templates/emails/` (HTML templates)
- Email configuration in `.env`

---

### Feature 2: SMS Service Integration ⭐ Priority
**Goal:** Send SMS notifications for critical updates

**Implementation:**
- SMS provider integration (Twilio/Africa's Talking)
- SMS queue processing
- SMS delivery tracking
- Cost management

**Use Cases:**
- Booking confirmations
- Payment confirmations
- Check-in reminders
- OTP for verification
- Emergency alerts

**Technical Approach:**
```python
# Use existing sms_queue table from Phase 3
# Process SMS queue in background
# Track delivery status
```

**Files to Create:**
- `backend/app/services/sms_service.py`
- SMS configuration in `.env`

---

### Feature 3: Real-time Updates (WebSocket) ⭐ Priority
**Goal:** Live updates without page refresh

**Implementation:**
- WebSocket server setup (FastAPI WebSocket)
- Real-time event broadcasting
- Client-side WebSocket connection
- Automatic reconnection

**Real-time Features:**
- Live room availability
- Live order status updates
- Live notification delivery
- Live booking updates
- Live payment confirmations
- Staff dashboard live updates

**Technical Approach:**
```python
# FastAPI WebSocket endpoint
# Redis pub/sub for multi-instance support (optional)
# React WebSocket hook
```

**Files to Create:**
- `backend/app/api/v1/endpoints/websocket.py`
- `backend/app/services/websocket_manager.py`
- `src/hooks/useWebSocket.ts`
- `src/lib/websocket.ts`

**Use Cases:**
```javascript
// Customer view
- See room availability update in real-time
- Get instant notification when order is ready
- See payment status change immediately

// Staff view
- See new bookings appear instantly
- Get alerts for new service requests
- Track order preparation in real-time
```

---

### Feature 4: Enhanced Payment Integration
**Goal:** Add more payment options beyond M-Pesa

**Providers to Integrate:**
1. **Stripe** (International cards, global support)
2. **PayPal** (International payments)
3. **Flutterwave** (African markets, multiple methods)

**Implementation:**
- Payment provider adapters
- Unified payment interface
- Payment method selection
- Currency conversion (if needed)

**Technical Approach:**
```python
# Payment factory pattern
# Provider-specific handlers
# Webhook handlers for each provider
```

**Files to Create:**
- `backend/app/services/payment_providers/stripe_service.py`
- `backend/app/services/payment_providers/paypal_service.py`
- `backend/app/services/payment_providers/flutterwave_service.py`
- `backend/app/services/payment_factory.py`

**Update Existing:**
- `src/components/PaymentModal.tsx` (add new payment options)
- `backend/app/api/v1/endpoints/payments.py` (add provider routes)

---

### Feature 5: In-App Messaging System
**Goal:** Enable communication between guests and staff

**Features:**
- Guest-to-staff messaging
- Staff-to-guest messaging
- Internal staff chat
- Message notifications
- Message history
- File attachments (optional)

**Database Tables:**
```sql
-- conversations
-- messages
-- message_participants
-- message_attachments (optional)
```

**Implementation:**
- Real-time message delivery via WebSocket
- Message persistence in database
- Unread message indicators
- Message search

**Files to Create:**
- `backend/sql/create_messaging_tables.sql`
- `backend/app/schemas/messaging.py`
- `backend/app/api/v1/endpoints/messages.py`
- `src/pages/MessagesPage.jsx`
- `src/components/ChatInterface.jsx`

---

### Feature 6: Cloud Storage Integration
**Goal:** Store images and files in cloud storage

**Provider:** AWS S3 / Cloudinary / Supabase Storage

**Use Cases:**
- Room images upload
- Menu item images
- User profile pictures
- Receipt/invoice PDFs
- Message attachments
- Review images

**Implementation:**
- Cloud storage client
- Upload endpoints
- Image optimization
- CDN delivery
- Signed URLs for security

**Files to Create:**
- `backend/app/services/storage_service.py`
- `backend/app/api/v1/endpoints/uploads.py`
- `src/components/ImageUpload.jsx`

---

### Feature 7: Notification Center UI
**Goal:** Complete the notification system with frontend

**Features:**
- Notification bell icon with badge
- Notification dropdown/panel
- Mark as read/unread
- Notification filtering
- Clear all notifications
- Notification preferences UI

**Implementation:**
- Use existing notification API from Phase 3
- Real-time notifications via WebSocket
- Sound and browser notifications
- Notification persistence

**Files to Create:**
- `src/components/NotificationCenter.jsx`
- `src/components/NotificationDropdown.jsx`
- `src/components/NotificationItem.jsx`

**Update Existing:**
- Add notification bell to main navigation
- Integrate with WebSocket for real-time delivery

---

### Feature 8: Broadcast Announcements
**Goal:** Send announcements to all users or specific groups

**Features:**
- Admin broadcast system
- Target specific user groups (guests, staff, VIPs)
- Schedule announcements
- Announcement templates
- Delivery tracking

**Use Cases:**
- Maintenance notifications
- Special offers
- Emergency alerts
- Policy updates
- Event announcements

**Implementation:**
- Bulk notification creation
- Group targeting
- Scheduled delivery
- Announcement history

**Files to Create:**
- `backend/app/api/v1/endpoints/announcements.py`
- `src/pages/AnnouncementsPage.jsx` (admin)

---

## Implementation Priority

### Phase 4A - Critical (Week 1-2)
**Focus:** Core communication features

1. ✅ Email Service Integration
   - Setup SendGrid/AWS SES
   - Create email templates
   - Process email queue
   - Test email delivery

2. ✅ SMS Service Integration
   - Setup Twilio/Africa's Talking
   - Process SMS queue
   - Test SMS delivery

3. ✅ Notification Center UI
   - Complete notification frontend
   - Real-time notification delivery
   - Notification preferences UI

### Phase 4B - Important (Week 3-4)
**Focus:** Real-time features

4. ✅ WebSocket Integration
   - Setup WebSocket server
   - Create client hooks
   - Implement real-time events
   - Test live updates

5. ✅ In-App Messaging
   - Create messaging database
   - Build chat interface
   - Real-time message delivery
   - Test messaging flow

### Phase 4C - Enhancement (Week 5-6)
**Focus:** Payment & storage

6. ✅ Enhanced Payment Integration
   - Add Stripe integration
   - Add PayPal integration
   - Add Flutterwave integration
   - Test payment flows

7. ✅ Cloud Storage
   - Setup S3/Cloudinary
   - Image upload system
   - File management
   - CDN integration

8. ✅ Broadcast Announcements
   - Admin broadcast UI
   - Scheduled delivery
   - Group targeting

---

## Technical Architecture

### Backend Stack
- **Email:** SendGrid/AWS SES
- **SMS:** Twilio/Africa's Talking
- **WebSocket:** FastAPI WebSocket
- **Storage:** AWS S3/Cloudinary/Supabase Storage
- **Payments:** Stripe, PayPal, Flutterwave (+ existing M-Pesa)
- **Queue Processing:** Background tasks/Celery (optional)

### Frontend Stack
- **WebSocket Client:** Native WebSocket API
- **Notifications:** Browser Notification API (existing)
- **File Upload:** Axios with multipart/form-data
- **Real-time UI:** React hooks with WebSocket

### Infrastructure
- **Environment Variables:**
  ```env
  # Email Service
  SENDGRID_API_KEY=
  EMAIL_FROM=noreply@premierhotel.com

  # SMS Service
  TWILIO_ACCOUNT_SID=
  TWILIO_AUTH_TOKEN=
  TWILIO_PHONE_NUMBER=

  # Storage
  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  AWS_S3_BUCKET=

  # Payments
  STRIPE_SECRET_KEY=
  STRIPE_PUBLISHABLE_KEY=
  PAYPAL_CLIENT_ID=
  PAYPAL_CLIENT_SECRET=
  FLUTTERWAVE_PUBLIC_KEY=
  FLUTTERWAVE_SECRET_KEY=
  ```

---

## Database Changes

### New Tables Needed

1. **Messaging Tables** (Feature 5)
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  type VARCHAR(20), -- 'guest_staff', 'staff_staff'
  subject VARCHAR(255),
  status VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  sender_id UUID REFERENCES auth.users(id),
  message_text TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES auth.users(id),
  last_read_at TIMESTAMP WITH TIME ZONE
);
```

2. **Announcements Table** (Feature 8)
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  message TEXT,
  target_group VARCHAR(50), -- 'all', 'guests', 'staff', 'vip'
  priority VARCHAR(20),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE
);
```

### Tables Already Created in Phase 3 ✅
- notification_templates
- notification_preferences
- notifications
- notification_delivery_log
- email_queue
- sms_queue
- notification_groups

---

## API Endpoints to Create

### Email Service
- POST `/api/v1/emails/send` - Send email
- GET `/api/v1/emails/queue` - Get email queue
- GET `/api/v1/emails/stats` - Email delivery stats

### SMS Service
- POST `/api/v1/sms/send` - Send SMS
- GET `/api/v1/sms/queue` - Get SMS queue
- GET `/api/v1/sms/stats` - SMS delivery stats

### WebSocket
- WS `/api/v1/ws/{user_id}` - WebSocket connection
- Broadcast events for: bookings, orders, payments, notifications

### Messaging
- GET `/api/v1/messages/conversations` - List conversations
- POST `/api/v1/messages/conversations` - Create conversation
- GET `/api/v1/messages/conversations/{id}` - Get messages
- POST `/api/v1/messages/send` - Send message
- PATCH `/api/v1/messages/{id}/read` - Mark as read

### Announcements
- GET `/api/v1/announcements` - List announcements
- POST `/api/v1/announcements` - Create announcement
- GET `/api/v1/announcements/{id}` - Get announcement
- PATCH `/api/v1/announcements/{id}` - Update announcement
- DELETE `/api/v1/announcements/{id}` - Delete announcement

### Uploads
- POST `/api/v1/uploads/image` - Upload image
- POST `/api/v1/uploads/file` - Upload file
- GET `/api/v1/uploads/{id}` - Get file URL
- DELETE `/api/v1/uploads/{id}` - Delete file

---

## Integration Points

### With Phase 2 (Payments)
- Trigger emails on payment success
- Send SMS for payment confirmations
- Real-time payment status updates via WebSocket

### With Phase 3 (Notifications)
- Process email queue from Phase 3 tables
- Process SMS queue from Phase 3 tables
- Use notification templates for email/SMS content
- Deliver notifications via WebSocket

### With Existing Features
- **Bookings:** Email confirmations, SMS reminders, real-time availability
- **Orders:** Order status updates via WebSocket, SMS when ready
- **Staff:** Real-time task assignments, messaging system
- **Reviews:** Email notifications for new reviews

---

## Testing Strategy

### Email Service Testing
1. Setup test email account
2. Send test emails for each template
3. Verify email delivery
4. Test email queue processing
5. Monitor delivery rates

### SMS Service Testing
1. Use sandbox/test numbers
2. Send test SMS
3. Verify SMS delivery
4. Check delivery logs
5. Monitor costs

### WebSocket Testing
1. Connect multiple clients
2. Test real-time events
3. Verify message delivery
4. Test reconnection logic
5. Load testing

### Payment Integration Testing
1. Use test API keys
2. Test card payments
3. Verify webhooks
4. Test failure scenarios
5. Check payment records

---

## Security Considerations

### Email Security
- SPF, DKIM, DMARC configuration
- Rate limiting on email sending
- Email content sanitization
- Unsubscribe links

### SMS Security
- Phone number validation
- SMS rate limiting
- Cost controls
- Opt-out handling

### WebSocket Security
- JWT authentication on connection
- Message validation
- Rate limiting
- Connection timeout

### Payment Security
- PCI DSS compliance
- Secure webhook verification
- API key protection
- Transaction logging

---

## Estimated Completion

### Phase 4A (Critical): 1-2 weeks
- Email/SMS integration
- Notification Center UI

### Phase 4B (Important): 2-3 weeks
- WebSocket implementation
- In-app messaging

### Phase 4C (Enhancement): 2-3 weeks
- Payment providers
- Cloud storage
- Announcements

**Total Duration:** 5-8 weeks for complete implementation

---

## Success Criteria

Phase 4 is complete when:
- ✅ Emails sent automatically for bookings/payments
- ✅ SMS notifications working for critical updates
- ✅ Real-time updates via WebSocket functional
- ✅ Notification Center UI fully operational
- ✅ In-app messaging working between staff and guests
- ✅ Multiple payment providers integrated
- ✅ Cloud storage for images operational
- ✅ Announcement system functional

---

## MVP Alignment

### Core MVP Features (Must Have)
1. ✅ Email notifications - **Phase 4A**
2. ✅ SMS notifications - **Phase 4A**
3. ✅ Real-time updates - **Phase 4B**
4. ✅ Notification Center - **Phase 4A**

### Enhanced MVP (Should Have)
5. ✅ In-app messaging - **Phase 4B**
6. ✅ Multiple payment options - **Phase 4C**
7. ✅ Cloud storage - **Phase 4C**

### Nice to Have
8. ✅ Broadcast announcements - **Phase 4C**

---

## Next Steps

1. **Review and Approve** this plan
2. **Choose providers:**
   - Email: SendGrid vs AWS SES vs Mailgun
   - SMS: Twilio vs Africa's Talking
   - Storage: AWS S3 vs Cloudinary vs Supabase Storage
   - Payments: Which providers to prioritize

3. **Setup accounts** for chosen providers
4. **Begin Phase 4A** implementation

---

**Ready to start Phase 4 implementation!**
