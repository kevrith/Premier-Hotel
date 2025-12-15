# 🚀 Phase 3 - Advanced Hotel Management Features

**Status:** In Progress
**Start Date:** December 12, 2025
**Target Completion:** TBD

---

## Overview

Phase 3 builds upon the foundation of Phase 1 (Basic Features) and Phase 2 (Payments & Analytics) to add advanced operational features for hotel staff and enhanced customer experience.

---

## 📋 Phase 3 Features (10 Major Features)

### 1. 👥 Staff Management System
**Priority:** HIGH
**Complexity:** Medium

**Backend:**
- Staff CRUD operations API
- Role assignment and permissions
- Staff scheduling system
- Attendance tracking
- Performance metrics

**Frontend:**
- Staff directory page
- Add/Edit staff forms
- Staff schedule calendar
- Attendance dashboard
- Role management interface

**Database:**
- `staff` table (if not using auth.users)
- `staff_shifts` table
- `staff_attendance` table
- `staff_performance` table

---

### 2. 📦 Inventory Management
**Priority:** HIGH
**Complexity:** High

**Backend:**
- Inventory items CRUD
- Stock level tracking
- Low stock alerts
- Purchase order management
- Inventory categories
- Supplier management

**Frontend:**
- Inventory dashboard
- Stock level monitoring
- Add/Edit inventory items
- Purchase order forms
- Low stock notifications
- Inventory reports

**Database:**
- `inventory_items` table
- `inventory_categories` table
- `stock_movements` table
- `purchase_orders` table
- `suppliers` table

---

### 3. 🧹 Housekeeping Management
**Priority:** HIGH
**Complexity:** Medium

**Backend:**
- Room cleaning tasks
- Task assignment to cleaners
- Task status tracking
- Cleaning schedules
- Room inspection logs

**Frontend:**
- Housekeeping dashboard
- Task list for cleaners
- Room status board (Clean/Dirty/In Progress)
- Task assignment interface
- Inspection forms

**Database:**
- `housekeeping_tasks` table
- `room_inspections` table
- `cleaning_schedules` table

---

### 4. ⭐ Customer Reviews & Ratings
**Priority:** MEDIUM
**Complexity:** Low

**Backend:**
- Review submission API
- Rating system (1-5 stars)
- Review moderation
- Review responses from management
- Average rating calculation

**Frontend:**
- Review submission form
- Rating display on rooms/menu items
- Review management dashboard
- Public review display
- Response interface for management

**Database:**
- `reviews` table (already exists, enhance if needed)
- `review_responses` table

---

### 5. 🛎️ Room Service Requests
**Priority:** MEDIUM
**Complexity:** Medium

**Backend:**
- Service request creation
- Request types (towels, toiletries, maintenance, etc.)
- Request assignment to staff
- Status tracking
- Request history

**Frontend:**
- Service request form (customer)
- Request dashboard (staff)
- Real-time status updates
- Request history for customers

**Database:**
- `service_requests` table
- `service_request_types` table

---

### 6. 🚪 Check-in / Check-out System
**Priority:** HIGH
**Complexity:** Medium

**Backend:**
- Check-in process API
- Check-out process API
- Room availability real-time updates
- Early check-in / late check-out fees
- Check-in/out history

**Frontend:**
- Check-in form (reception)
- Check-out form with final bill
- ID verification upload
- Digital signature
- Receipt generation

**Database:**
- `check_in_logs` table
- `check_out_logs` table
- Update `bookings` table with check-in/out timestamps

---

### 7. 💰 Expense Tracking
**Priority:** MEDIUM
**Complexity:** Low

**Backend:**
- Expense entry API
- Expense categories
- Expense approval workflow
- Expense reports

**Frontend:**
- Expense entry form
- Expense list and filters
- Approval interface (manager)
- Expense reports and charts

**Database:**
- `expenses` table
- `expense_categories` table

---

### 8. 🎫 Loyalty Program
**Priority:** LOW
**Complexity:** Medium

**Backend:**
- Points calculation system
- Reward redemption
- Membership tiers
- Points history

**Frontend:**
- Loyalty dashboard for customers
- Points display
- Rewards catalog
- Redemption interface

**Database:**
- `loyalty_points` table
- `loyalty_tiers` table
- `rewards` table
- `reward_redemptions` table

---

### 9. 📊 Advanced Analytics & Forecasting
**Priority:** MEDIUM
**Complexity:** High

**Backend:**
- Occupancy rate predictions
- Revenue forecasting
- Customer behavior analysis
- Seasonal trends analysis
- Performance KPIs

**Frontend:**
- Advanced analytics dashboard
- Forecasting charts
- Trend analysis
- Export to Excel/PDF

**Database:**
- Use existing tables with advanced queries
- Possibly add `analytics_snapshots` for caching

---

### 10. 🔔 Advanced Notification System
**Priority:** LOW
**Complexity:** Medium

**Backend:**
- Email notifications (SendGrid/AWS SES)
- SMS notifications (Twilio/Africa's Talking)
- Push notifications
- Notification preferences
- Notification templates

**Frontend:**
- Notification center
- Notification preferences page
- In-app notification bell
- Notification history

**Database:**
- `notification_preferences` table
- `notification_logs` table
- `notification_templates` table

---

## 🎯 Phase 3 Implementation Priority

### Sprint 1 (Week 1-2): Core Operations
1. ✅ Staff Management System
2. ✅ Housekeeping Management
3. ✅ Check-in/Check-out System

### Sprint 2 (Week 3-4): Inventory & Services
4. ✅ Inventory Management
5. ✅ Room Service Requests
6. ✅ Customer Reviews & Ratings

### Sprint 3 (Week 5-6): Analytics & Engagement
7. ✅ Expense Tracking
8. ✅ Advanced Analytics
9. ✅ Loyalty Program
10. ✅ Advanced Notifications

---

## 📁 File Structure for Phase 3

### Backend Files to Create

```
backend/
├── app/
│   ├── api/v1/endpoints/
│   │   ├── staff.py              # Staff management
│   │   ├── inventory.py          # Inventory management
│   │   ├── housekeeping.py       # Housekeeping tasks
│   │   ├── reviews.py            # Enhanced reviews
│   │   ├── service_requests.py   # Room service
│   │   ├── checkin.py            # Check-in/out
│   │   ├── expenses.py           # Expense tracking
│   │   ├── loyalty.py            # Loyalty program
│   │   └── analytics.py          # Enhanced analytics
│   │
│   ├── services/
│   │   ├── notification_email.py # Email notifications
│   │   ├── notification_sms.py   # SMS notifications
│   │   ├── forecasting.py        # Analytics forecasting
│   │   └── loyalty_calculator.py # Points calculation
│   │
│   └── schemas/
│       ├── staff.py
│       ├── inventory.py
│       ├── housekeeping.py
│       ├── service_request.py
│       ├── checkin.py
│       ├── expense.py
│       └── loyalty.py
│
└── sql/
    ├── create_staff_tables.sql
    ├── create_inventory_tables.sql
    ├── create_housekeeping_tables.sql
    ├── create_service_requests_table.sql
    ├── create_checkin_tables.sql
    ├── create_expense_tables.sql
    └── create_loyalty_tables.sql
```

### Frontend Files to Create

```
src/
├── pages/
│   ├── StaffManagement.jsx       # Staff directory
│   ├── StaffSchedule.jsx         # Staff scheduling
│   ├── InventoryDashboard.jsx    # Inventory management
│   ├── HousekeepingDashboard.jsx # Housekeeping tasks
│   ├── ServiceRequests.jsx       # Service requests
│   ├── CheckIn.jsx               # Check-in process
│   ├── CheckOut.jsx              # Check-out process
│   ├── ExpenseManagement.jsx     # Expense tracking
│   ├── LoyaltyProgram.jsx        # Customer loyalty
│   ├── AdvancedAnalytics.jsx     # Enhanced analytics
│   ├── ReviewManagement.jsx      # Review moderation
│   └── NotificationCenter.jsx    # Notification hub
│
├── components/
│   ├── StaffCard.jsx
│   ├── InventoryTable.jsx
│   ├── StockAlertBadge.jsx
│   ├── HousekeepingTaskCard.jsx
│   ├── RoomStatusBoard.jsx
│   ├── ServiceRequestForm.jsx
│   ├── CheckInForm.jsx
│   ├── CheckOutForm.jsx
│   ├── ReviewCard.jsx
│   ├── RatingStars.jsx
│   ├── ExpenseForm.jsx
│   ├── LoyaltyCard.jsx
│   ├── PointsDisplay.jsx
│   └── ForecastChart.jsx
│
└── lib/api/
    ├── staff.ts
    ├── inventory.ts
    ├── housekeeping.ts
    ├── serviceRequests.ts
    ├── checkin.ts
    ├── expenses.ts
    ├── loyalty.ts
    └── advancedAnalytics.ts
```

---

## 🗄️ Database Schema for Phase 3

### 1. Staff Tables

```sql
-- Staff information (if not using auth.users)
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    employee_id VARCHAR(50) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    position VARCHAR(100),
    department VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Staff shifts
CREATE TABLE staff_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id),
    shift_date DATE,
    start_time TIME,
    end_time TIME,
    shift_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Attendance
CREATE TABLE staff_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID REFERENCES staff(id),
    date DATE,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    status VARCHAR(20),
    notes TEXT
);
```

### 2. Inventory Tables

```sql
-- Inventory items
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200),
    category_id UUID REFERENCES inventory_categories(id),
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    unit VARCHAR(50),
    quantity DECIMAL(10,2),
    min_quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    supplier_id UUID REFERENCES suppliers(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Categories
CREATE TABLE inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    description TEXT
);

-- Stock movements
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID REFERENCES inventory_items(id),
    movement_type VARCHAR(20), -- 'in', 'out', 'adjustment'
    quantity DECIMAL(10,2),
    reference_type VARCHAR(50),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Housekeeping Tables

```sql
-- Housekeeping tasks
CREATE TABLE housekeeping_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id),
    assigned_to UUID REFERENCES auth.users(id),
    task_type VARCHAR(50), -- 'cleaning', 'inspection', 'maintenance'
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    scheduled_time TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Room inspections
CREATE TABLE room_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id),
    inspector_id UUID REFERENCES auth.users(id),
    inspection_date TIMESTAMP,
    cleanliness_score INTEGER CHECK (cleanliness_score BETWEEN 1 AND 5),
    maintenance_issues TEXT,
    notes TEXT,
    status VARCHAR(20)
);
```

### 4. Service Requests Tables

```sql
-- Service requests
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    guest_id UUID REFERENCES auth.users(id),
    request_type VARCHAR(50),
    description TEXT,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'pending',
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);
```

### 5. Check-in/Check-out Tables

```sql
-- Check-in logs
CREATE TABLE check_in_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    checked_in_by UUID REFERENCES auth.users(id),
    check_in_time TIMESTAMP DEFAULT NOW(),
    id_verification JSONB,
    notes TEXT
);

-- Check-out logs
CREATE TABLE check_out_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id),
    checked_out_by UUID REFERENCES auth.users(id),
    check_out_time TIMESTAMP DEFAULT NOW(),
    final_bill DECIMAL(10,2),
    damages JSONB,
    notes TEXT
);
```

### 6. Loyalty Tables

```sql
-- Loyalty points
CREATE TABLE loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'bronze',
    lifetime_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Loyalty transactions
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    transaction_type VARCHAR(20), -- 'earn', 'redeem'
    points INTEGER,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 API Endpoints for Phase 3

### Staff Management (10 endpoints)
- `GET /api/v1/staff` - List all staff
- `POST /api/v1/staff` - Add new staff member
- `GET /api/v1/staff/{id}` - Get staff details
- `PUT /api/v1/staff/{id}` - Update staff
- `DELETE /api/v1/staff/{id}` - Remove staff
- `GET /api/v1/staff/shifts` - Get shifts schedule
- `POST /api/v1/staff/shifts` - Create shift
- `GET /api/v1/staff/attendance` - Attendance records
- `POST /api/v1/staff/attendance/check-in` - Check in
- `POST /api/v1/staff/attendance/check-out` - Check out

### Inventory Management (12 endpoints)
- `GET /api/v1/inventory/items` - List inventory
- `POST /api/v1/inventory/items` - Add item
- `GET /api/v1/inventory/items/{id}` - Get item details
- `PUT /api/v1/inventory/items/{id}` - Update item
- `DELETE /api/v1/inventory/items/{id}` - Delete item
- `GET /api/v1/inventory/low-stock` - Low stock alerts
- `POST /api/v1/inventory/movements` - Record movement
- `GET /api/v1/inventory/movements` - Movement history
- `GET /api/v1/inventory/categories` - List categories
- `POST /api/v1/inventory/purchase-orders` - Create PO
- `GET /api/v1/inventory/purchase-orders` - List POs
- `GET /api/v1/inventory/reports` - Inventory reports

### Housekeeping (8 endpoints)
- `GET /api/v1/housekeeping/tasks` - List tasks
- `POST /api/v1/housekeeping/tasks` - Create task
- `PUT /api/v1/housekeeping/tasks/{id}` - Update task
- `GET /api/v1/housekeeping/tasks/my-tasks` - My assigned tasks
- `POST /api/v1/housekeeping/inspections` - Create inspection
- `GET /api/v1/housekeeping/inspections` - List inspections
- `GET /api/v1/housekeeping/room-status` - Room status board
- `PATCH /api/v1/housekeeping/tasks/{id}/complete` - Mark complete

### Service Requests (6 endpoints)
- `POST /api/v1/service-requests` - Create request
- `GET /api/v1/service-requests` - List requests
- `GET /api/v1/service-requests/{id}` - Get request details
- `PATCH /api/v1/service-requests/{id}/assign` - Assign to staff
- `PATCH /api/v1/service-requests/{id}/complete` - Mark complete
- `GET /api/v1/service-requests/my-requests` - Guest's requests

### Check-in/Check-out (6 endpoints)
- `POST /api/v1/checkin` - Check-in guest
- `GET /api/v1/checkin/{booking_id}` - Check-in details
- `POST /api/v1/checkout` - Check-out guest
- `GET /api/v1/checkout/{booking_id}` - Check-out details
- `GET /api/v1/checkin/pending` - Pending check-ins
- `GET /api/v1/checkout/pending` - Pending check-outs

### Reviews (Enhanced - 7 endpoints)
- `POST /api/v1/reviews` - Submit review
- `GET /api/v1/reviews` - List all reviews
- `GET /api/v1/reviews/{id}` - Get review details
- `PUT /api/v1/reviews/{id}` - Update review
- `DELETE /api/v1/reviews/{id}` - Delete review
- `POST /api/v1/reviews/{id}/respond` - Management response
- `GET /api/v1/reviews/moderate` - Reviews pending moderation

### Loyalty Program (6 endpoints)
- `GET /api/v1/loyalty/points` - Get user points
- `POST /api/v1/loyalty/earn` - Earn points
- `POST /api/v1/loyalty/redeem` - Redeem points
- `GET /api/v1/loyalty/transactions` - Points history
- `GET /api/v1/loyalty/rewards` - Available rewards
- `GET /api/v1/loyalty/tiers` - Loyalty tiers info

### Expenses (5 endpoints)
- `POST /api/v1/expenses` - Create expense
- `GET /api/v1/expenses` - List expenses
- `PUT /api/v1/expenses/{id}` - Update expense
- `PATCH /api/v1/expenses/{id}/approve` - Approve expense
- `GET /api/v1/expenses/reports` - Expense reports

---

## 📈 Success Metrics for Phase 3

### Technical Metrics
- [ ] 60+ new API endpoints
- [ ] 15+ new database tables
- [ ] 20+ new React components
- [ ] 12+ new pages
- [ ] 100% test coverage for critical features

### Business Metrics
- [ ] 50% reduction in manual staff management time
- [ ] Real-time inventory tracking
- [ ] 90% reduction in housekeeping task tracking time
- [ ] 24/7 service request submission
- [ ] Streamlined check-in/out process

---

## 🎯 Starting Point: Sprint 1

We'll start with the highest priority features:

### 1. Staff Management System (Starting Now)
- Create backend endpoints
- Create database tables
- Build frontend UI
- Test and integrate

### 2. Housekeeping Management
### 3. Check-in/Check-out System

---

**Let's begin with Staff Management! 🚀**
