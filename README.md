# Premier Hotel Management System

A full-stack hotel management application built with React 19, TypeScript, and FastAPI — designed to run every aspect of a hotel from a single platform.

**Live:** [premier-hotel.vercel.app](https://premier-hotel.vercel.app) · **API:** [premier-hotel.onrender.com](https://premier-hotel.onrender.com)

---

## Overview

Premier Hotel provides a unified platform for managing room bookings, restaurant orders, staff operations, housekeeping, inventory, stock, payments, and guest communication. It supports seven distinct roles with dedicated dashboards and real-time updates throughout.

**Roles:** Customer · Waiter · Chef · Cleaner · Manager · Admin · Owner

---

## Features

### Customer
- Room browsing, booking, check-in, and check-out
- Food ordering with real-time 6-stage order tracking
- Bill viewing and payment (M-Pesa STK Push, Cash, Card, Room Charge)
- Service requests and in-app messaging with staff
- Loyalty points, booking history, and pre-arrival registration

### Chef
- Kitchen order queue with full status management (pending → preparing → ready)
- Real-time order notifications via WebSocket
- Kitchen stock visibility

### Waiter
- Table and room-service order management with QR scan support
- Bill creation, split-bill handling, and payment processing
- Delivery tracking, void requests, and customer service requests
- Per-item discounts with manager PIN approval

### Cleaner
- Room cleaning task queue with status tracking
- Housekeeping supplies tracking and inspection checklists
- Lost and found management
- Linen and maintenance request logging

### Manager
- Staff management: add/edit, shifts, attendance, performance tracking
- Analytics: revenue trends, occupancy, employee sales, item summary
- Menu management: items, categories, pricing, promotions, recipe management
- Stock management: kitchen stock, office supplies, utensils (lost/broken tracking), daily stock taking, central store transfers
- Order oversight and void approval
- Discount management and preset configurations
- Financial reports: P&L, cash flow, VAT, inventory closing stock, comparative analysis
- Restaurant table management
- Petty cash tracking

### Admin
- Full user and staff management with granular permissions
- System configuration and audit logs
- Advanced reporting: employee sales breakdown, customer insights, inventory reports, voided items
- Purchase orders and supplier management with goods receiving
- Stock receiving and location-based stock transfers
- QuickBooks integration: sync, item mapping, reporting via Web Connector
- Tax settings, pricing controls, and promotions management
- Import/export center (menu, stock data)
- Expense tracking and petty cash
- Branch/location management

### Owner
- Consolidated multi-branch performance dashboard
- Revenue analytics across all locations
- Staff and operations overview
- Export and reporting access

### System-Wide
- Real-time WebSocket notifications (orders, housekeeping, alerts)
- Progressive Web App (PWA) — installable, offline-capable with background sync
- English and Swahili language support (i18next)
- Dark mode support
- PDF and Excel export for reports
- QR code and barcode scanning
- SMS notifications via Africa's Talking
- Google OAuth sign-in
- Granular role permissions system

---

## Tech Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 19 + TypeScript | UI framework |
| Vite | Build tool and dev server |
| Tailwind CSS + Radix UI | Styling and accessible components |
| Zustand 5 | State management |
| TanStack React Query 5 | Data fetching and caching |
| Socket.IO Client | Real-time WebSocket communication |
| Axios | HTTP client |
| Dexie (IndexedDB) | Offline data storage |
| i18next + react-i18next | Internationalization (English + Swahili) |
| Recharts + Chart.js | Data visualization |
| jsPDF + jspdf-autotable | PDF report export |
| XLSX | Excel export |
| Formik + Yup | Form handling and validation |
| Lucide React + React Icons | Icons |
| @react-oauth/google | Google OAuth sign-in |
| jsQR + qrcode.react | QR/barcode scanning and generation |
| date-fns | Date utilities |
| react-hot-toast + sonner | Toast notifications |
| workbox (vite-plugin-pwa) | PWA and service worker |

### Backend

| Technology | Purpose |
|------------|---------|
| FastAPI | High-performance Python web framework |
| Uvicorn | ASGI server |
| Supabase (PostgreSQL) | Database, authentication, and storage |
| Pydantic V2 | Data validation |
| python-jose | JWT token handling |
| passlib (bcrypt) | Password hashing |
| WebSockets | Real-time communication |
| Africa's Talking SDK | SMS notifications |
| asyncpg | Async PostgreSQL driver |
| slowapi | Rate limiting |
| loguru | Logging |

---

## Project Structure

```
premier-hotel/
├── src/
│   ├── components/
│   │   ├── Admin/          # Admin dashboard (users, reports, QuickBooks, suppliers, stock)
│   │   ├── Manager/        # Manager dashboard (staff, analytics, menu, reports, stock)
│   │   ├── Owner/          # Owner dashboard (multi-branch analytics, reports)
│   │   ├── Chef/           # Kitchen order queue and stock
│   │   ├── Waiter/         # Table and order management, billing
│   │   ├── Cleaner/        # Housekeeping tasks, lost & found
│   │   ├── Stock/          # Unified stock hub (daily taking, location stock)
│   │   ├── BookingSystem/  # Room booking flow
│   │   ├── FoodOrdering/   # Menu and order flow
│   │   ├── CheckIn/        # Guest check-in
│   │   ├── CheckOut/       # Guest check-out and billing
│   │   ├── Bills/          # Bill management
│   │   ├── Inventory/      # Inventory UI
│   │   ├── Messaging/      # In-app messaging
│   │   ├── Housekeeping/   # Housekeeping components
│   │   ├── Office/         # Office stock and supplies
│   │   ├── Kitchen/        # Kitchen-specific views
│   │   ├── Offline/        # Offline mode components
│   │   └── ui/             # Shared UI primitives (Radix-based)
│   ├── pages/              # Route-level pages
│   ├── stores/             # Zustand state stores
│   ├── services/           # API service layer
│   ├── hooks/              # Custom React hooks
│   ├── contexts/           # React context providers
│   ├── types/              # TypeScript type definitions
│   ├── lib/api/            # Typed API client modules
│   └── i18n/               # Translation files (en, sw)
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # 50+ route handlers
│   │   ├── core/              # Config, security, dependencies
│   │   ├── middleware/         # Auth, rate limiting
│   │   ├── utils/             # Helper utilities
│   │   └── websocket/         # WebSocket connection manager
│   ├── migrations/            # SQL migration files (12 files)
│   ├── sql/migrations/        # Numbered SQL migrations (25 files)
│   └── supabase_schema.sql    # Base database schema
├── supabase/migrations/       # Supabase-managed migrations (55 files)
├── render.yaml                # Render deployment config (backend)
├── vercel.json                # Vercel deployment config (frontend)
├── start.sh                   # Start frontend + backend locally
├── stop.sh                    # Stop the application
└── status.sh                  # Check running status
```

---

## Installation

### Prerequisites

- Node.js >= 18
- Python >= 3.10
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone

```bash
git clone https://github.com/kevrith/Premier-Hotel.git
cd Premier-Hotel
```

### 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Fill in your credentials
```

### 3. Frontend setup

```bash
cd ..
npm install
```

### 4. Database

In your Supabase project's SQL editor, run:
1. `backend/supabase_schema.sql` — base tables
2. All files in `backend/sql/migrations/` in order
3. All files in `backend/migrations/` as needed
4. All files in `supabase/migrations/` via Supabase CLI or SQL editor

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

### Backend (`backend/.env`)

```env
# App
APP_NAME=Premier Hotel API
ENVIRONMENT=development
SECRET_KEY=your-32-char-secret        # openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=30

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:5173","https://your-frontend.vercel.app"]

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Premier Hotel

# M-Pesa (Safaricom Daraja)
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://your-api.onrender.com/api/v1/payments/mpesa/callback

# Africa's Talking (SMS)
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_API_KEY=your-api-key
```

> All secrets are set via the Render dashboard in production — never commit real values.

---

## API Overview

Full interactive docs at `http://localhost:8000/docs` (Swagger) or `/redoc`.

| Area | Prefix |
|------|--------|
| Authentication | `/api/v1/auth` |
| Rooms | `/api/v1/rooms` |
| Bookings | `/api/v1/bookings` |
| Check-in / Check-out | `/api/v1/checkin-checkout` |
| Menu | `/api/v1/menu` |
| Orders | `/api/v1/orders` |
| Manager Orders | `/api/v1/orders/manager` |
| Bills & Payments | `/api/v1/bills` |
| Order Billing | `/api/v1/order-billing` |
| Combined Checkout | `/api/v1/checkout` |
| POS Payments (M-Pesa) | `/api/v1/pos-payments` |
| Reports | `/api/v1/reports` |
| Analytics | `/api/v1/analytics` |
| Dashboard | `/api/v1/dashboard` |
| Owner Dashboard | `/api/v1/owner` |
| Staff | `/api/v1/staff` |
| Housekeeping | `/api/v1/housekeeping` |
| Service Requests | `/api/v1/service-requests` |
| Inventory | `/api/v1/inventory` |
| Stock Management | `/api/v1/stock` |
| Daily Stock Taking | `/api/v1/daily-stock` |
| Location Stock | `/api/v1/location-stock` |
| Locations | `/api/v1/locations` |
| Kitchen & Office Stock | `/api/v1/kitchen-stock` |
| Purchase Orders | `/api/v1/purchase-orders` |
| Discounts | `/api/v1/discounts` |
| Recipes | `/api/v1/recipes` |
| Restaurant Tables | `/api/v1/tables` |
| Petty Cash | `/api/v1/petty-cash` |
| Expenses | `/api/v1/expenses` |
| Loyalty Program | `/api/v1/loyalty` |
| Customers | `/api/v1/customers` |
| Notifications | `/api/v1/notifications` |
| Messaging | `/api/v1/messages` |
| Financial Statements | `/api/v1/financial` |
| Hotel Settings | `/api/v1/settings` |
| Permissions | `/api/v1/permissions` |
| QuickBooks | `/api/v1/quickbooks` |
| Admin | `/api/v1/admin` |
| Reviews | `/api/v1/reviews` |
| Maintenance | `/api/v1/maintenance` |
| Image Upload | `/api/v1/upload` |
| System Health | `/api/v1/system/health` |
| WebSocket | `ws://.../api/v1/ws` |

---

## Deployment

### Backend → Render
Configured via `render.yaml`. The backend deploys automatically on push to `main`.

```
Build: pip install -r requirements.txt
Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Frontend → Vercel
Configured via `vercel.json`. React SPA with HTML5 history fallback.

```
Build: npm run build
Output: dist/
```

---

## Scripts

```bash
./start.sh      # Start frontend (port 5173) and backend (port 8000)
./stop.sh       # Stop both processes
./status.sh     # Check if both are running
```

Manual startup:

```bash
# Terminal 1 — backend
cd backend && source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — frontend
npm run dev
```

---

## License

MIT
