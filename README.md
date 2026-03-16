# Premier Hotel Management System

A full-stack hotel management application built with React, TypeScript, and FastAPI — designed to streamline hotel operations across every role.

---

## Overview

Premier Hotel provides a unified platform for managing room bookings, food orders, staff operations, housekeeping, inventory, payments, and guest communication. It supports multiple roles with dedicated interfaces and real-time updates throughout.

**Roles:** Customer, Waiter, Chef, Cleaner, Manager, Admin

---

## Features

### Customer
- Room browsing, booking, check-in, and check-out
- Food ordering with real-time 6-stage order tracking
- Bill viewing and payment (M-Pesa STK Push, Cash, Card)
- Service requests and in-app messaging with staff
- Loyalty points and booking history

### Chef
- Kitchen order queue with status management
- Real-time order notifications via WebSocket

### Waiter
- Table and order management
- Delivery tracking and customer service requests

### Cleaner
- Room cleaning task queue
- Housekeeping supplies tracking and inspection checklists
- Lost and found management

### Manager
- Staff management (add/edit/delete, shifts, attendance, performance)
- Analytics and revenue reports
- Menu management (items, categories, pricing, promotions)
- Inventory and stock management
- Order management and oversight

### Admin
- Full user and staff management
- System configuration and audit logs
- Advanced reporting (employee sales, customer reports)
- Purchase orders and supplier management
- Inventory management
- QuickBooks integration (sync, item mapping, reporting)
- Tax settings and pricing controls

### System-Wide
- Real-time WebSocket notifications
- Progressive Web App (PWA) — installable, offline-capable
- English and Swahili language support (i18next)
- Dark mode support
- PDF and Excel export for reports
- QR code scanning

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React + TypeScript | UI framework with strict type checking |
| Vite | Build tool and dev server |
| Tailwind CSS + Radix UI | Styling and accessible components |
| Zustand | State management |
| React Query (@tanstack) | Data fetching and caching |
| Socket.IO Client | Real-time WebSocket communication |
| Axios | HTTP client |
| Dexie (IndexedDB) | Offline data storage |
| i18next | Internationalization (English + Swahili) |
| Recharts + Chart.js | Data visualization |
| jsPDF + XLSX | Report export |
| Formik + Yup | Form handling and validation |
| Lucide React + React Icons | Icons |

### Backend

| Technology | Purpose |
|------------|---------|
| FastAPI | High-performance Python web framework |
| Uvicorn | ASGI server |
| Supabase (PostgreSQL) | Database and authentication |
| SQLAlchemy 2.0 | ORM |
| Pydantic V2 | Data validation |
| python-jose | JWT token handling |
| passlib (bcrypt) | Password hashing |
| WebSockets | Real-time communication |

---

## Project Structure

```
premier-hotel/
├── src/
│   ├── components/
│   │   ├── Admin/          # Admin dashboard (users, reports, QuickBooks, suppliers)
│   │   ├── Manager/        # Manager dashboard (staff, analytics, menu, inventory)
│   │   ├── Chef/           # Kitchen order queue
│   │   ├── Waiter/         # Table and order management
│   │   ├── Cleaner/        # Housekeeping tasks
│   │   ├── BookingSystem/  # Room booking flow
│   │   ├── FoodOrdering/   # Menu and order flow
│   │   ├── CheckIn/        # Guest check-in
│   │   ├── CheckOut/       # Guest check-out and billing
│   │   ├── Bills/          # Bill management
│   │   ├── Inventory/      # Inventory UI
│   │   ├── Messaging/      # In-app messaging
│   │   ├── Housekeeping/   # Housekeeping components
│   │   └── ui/             # Shared UI primitives
│   ├── pages/              # Route-level pages
│   ├── stores/             # Zustand state stores
│   ├── services/           # API service layer
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React context providers
│   ├── types/              # TypeScript type definitions
│   └── i18n/               # Translation files
├── backend/
│   ├── app/
│   │   ├── api/            # Route handlers
│   │   ├── core/           # Config, security
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── websocket/      # WebSocket manager
│   ├── migrations/         # SQL migration files
│   └── supabase_schema.sql # Full database schema
├── start.sh                # Start frontend + backend
├── stop.sh                 # Stop the application
└── status.sh               # Check running status
```

---

## Installation

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone

```bash
git clone https://github.com/yourusername/premier-hotel.git
cd premier-hotel
```

### 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Edit with your credentials
```

### 3. Frontend setup

```bash
cd ..
npm install
cp .env.example .env            # Edit with your credentials
```

### 4. Database

In your Supabase project's SQL editor, run the contents of `backend/supabase_schema.sql`.

### 5. Create an admin account

```bash
cd backend
./create_admin.sh
```

### 6. Start the app

```bash
./start.sh
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Environment Variables

### Frontend (`.env` in project root)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1/ws
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME=Premier Hotel
```

### Backend (`backend/.env`)

```env
APP_NAME=Premier Hotel API
ENVIRONMENT=development
SECRET_KEY=your-secret-key        # openssl rand -hex 32
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
JWT_SECRET_KEY=your-jwt-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/v1/payments/mpesa/callback
ALLOWED_ORIGINS=http://localhost:5173
```

---

## API Overview

Full interactive docs at `http://localhost:8000/docs`.

| Area | Endpoints |
|------|-----------|
| Auth | register, login, logout, refresh, me, profile, change-password |
| Rooms | list, get, create, update, delete, availability |
| Bookings | list, create, cancel, check-in, check-out |
| Menu | items CRUD |
| Orders | create, list, status update, kitchen queue |
| Payments | initiate, M-Pesa callback, status |
| Staff | list, attendance, performance |
| Housekeeping | tasks, inspections, supplies |
| Inventory | items, stock levels, purchase orders |
| Reports | revenue, employee sales, customer reports |
| Notifications | list, preferences, WebSocket (`/api/v1/ws`) |

---

## Scripts

```bash
./start.sh      # Start frontend and backend
./stop.sh       # Stop the application
./status.sh     # Check running status
```

Manual startup:

```bash
# Terminal 1 — backend
cd backend && ./venv/bin/python3 -m uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
npm run dev
```

---

## License

MIT
