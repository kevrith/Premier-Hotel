# Premier Hotel Backend API

FastAPI backend for the Premier Hotel Management System, backed by Supabase (PostgreSQL).

**Live API:** [premier-hotel.onrender.com](https://premier-hotel.onrender.com) · **Docs:** [/docs](https://premier-hotel.onrender.com/docs)

---

## Stack

| Technology | Purpose |
|------------|---------|
| FastAPI | High-performance Python web framework |
| Uvicorn | ASGI server |
| Supabase (PostgreSQL) | Primary database, authentication, and storage |
| Pydantic V2 | Data validation and settings |
| python-jose | JWT token handling |
| passlib (bcrypt) | Password hashing |
| WebSockets | Real-time communication |
| Africa's Talking SDK | SMS notifications |
| asyncpg | Async PostgreSQL driver |
| slowapi | Rate limiting |
| loguru | Structured logging |
| Jinja2 | Email templating |

---

## Setup

### 1. Create virtual environment

```bash
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
```

Required values in `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres

# JWT
SECRET_KEY=your-32-char-secret     # openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:5173","https://your-frontend.vercel.app"]

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Premier Hotel

# SMS (Africa's Talking)
AFRICASTALKING_USERNAME=your-username
AFRICASTALKING_API_KEY=your-api-key

# M-Pesa (Safaricom Daraja)
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://your-api.onrender.com/api/v1/pos-payments/mpesa/callback
```

### 3. Run the server

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 4. Create an admin account

```bash
./create_admin.sh
```

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # App entry point, middleware, startup
│   ├── api/
│   │   └── v1/
│   │       ├── api.py           # Route aggregator
│   │       └── endpoints/       # 50+ route handler modules
│   ├── core/                    # Config, security, dependencies
│   ├── models/                  # QuickBooks integration models
│   ├── services/                # Business logic
│   │   ├── email_service.py     # Gmail SMTP
│   │   ├── sms_service.py       # Africa's Talking
│   │   ├── mpesa.py             # M-Pesa STK Push
│   │   ├── paystack.py          # Paystack card/bank
│   │   ├── paypal.py            # PayPal
│   │   ├── quickbooks_sync.py   # QuickBooks sync
│   │   └── websocket_manager.py # WebSocket broadcasting
│   ├── middleware/              # Auth, rate limiting
│   ├── utils/                   # Helper utilities
│   ├── websocket/               # WebSocket connection manager
│   └── templates/               # Jinja2 email templates
├── migrations/                  # Supplemental SQL migrations (12 files)
├── sql/migrations/              # Numbered SQL migrations (25 files)
├── supabase_schema.sql          # Base database schema
├── requirements.txt
└── create_admin.sh              # Create super admin account
```

---

## API Endpoints

All routes are prefixed with `/api/v1`.

### Authentication
```
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
PATCH  /auth/profile
POST   /auth/change-password
POST   /auth/google
```

### Rooms & Bookings
```
GET/POST/PUT/DELETE   /rooms
GET                   /rooms/available
GET/PATCH             /bookings
POST                  /bookings/{id}/cancel
GET/POST/PUT/DELETE   /checkin-checkout
```

### Menu & Orders
```
GET/POST/PUT/DELETE   /menu/items
GET/POST/PUT/DELETE   /menu/categories
GET/POST              /orders
PATCH                 /orders/{id}/status
GET                   /orders/kitchen           (Chef)
GET/POST/PATCH        /orders/manager           (Manager)
```

### Billing & Payments
```
GET/POST              /bills
POST                  /bills/{id}/pay
GET/POST              /order-billing
POST                  /checkout
GET/POST              /pos-payments
POST                  /pos-payments/mpesa/callback
```

### Staff & Housekeeping
```
GET/POST/PUT/DELETE   /staff
POST                  /staff/attendance
GET                   /staff/performance
GET/POST/PUT          /housekeeping
GET/POST              /service-requests
```

### Stock & Inventory
```
GET/POST/PUT/DELETE   /inventory
GET/POST/PUT/DELETE   /stock
GET/POST/PUT/DELETE   /daily-stock
GET/POST/PUT/DELETE   /location-stock
GET/POST/PUT/DELETE   /locations
GET/POST/PUT/DELETE   /kitchen-stock
GET/POST/PUT/DELETE   /purchase-orders
GET/POST/PUT          /recipes
```

### Finance & Reports
```
GET                   /reports/overview
GET                   /reports/revenue
GET                   /reports/bookings-stats
GET                   /reports/orders-stats
GET                   /reports/top-customers
GET                   /reports/item-summary
GET                   /reports/employee-sales
GET                   /reports/employee/{id}/details
GET                   /analytics
GET                   /dashboard
GET                   /owner
GET                   /financial
GET/POST              /expenses
GET/POST              /petty-cash
```

### Customers & Loyalty
```
GET/PUT               /customers
GET/POST              /loyalty
GET/POST              /reviews
```

### Settings & Admin
```
GET/POST/PUT          /settings
GET/POST/PUT/DELETE   /admin
GET/POST/PUT/DELETE   /permissions
GET/POST              /discounts
GET/POST/PUT          /restaurant-tables
GET/POST/PUT          /notifications
GET/POST              /messages
GET/POST              /quickbooks
POST                  /upload
GET                   /system/health
GET/POST              /maintenance
```

### Real-time
```
WS    /ws              WebSocket connection
```

Full interactive documentation at `/docs` (Swagger) or `/redoc`.

---

## Database

The backend uses the **Supabase Python client** as the primary data access layer. Database schema is managed via SQL migrations split across three locations:

1. `supabase_schema.sql` — base tables (run first)
2. `sql/migrations/` — 25 numbered migration files (run in order)
3. `migrations/` — 12 supplemental migration files
4. `supabase/migrations/` — 55 Supabase-managed migrations (run via Supabase CLI or SQL editor)

Key tables: `users`, `rooms`, `bookings`, `menu_items`, `orders`, `bills`, `payments`, `staff`, `housekeeping_tasks`, `inventory`, `kitchen_stock`, `office_supplies`, `utensils`, `daily_stock_takes`, `location_stock`, `locations`, `recipes`, `discounts`, `restaurant_tables`, `petty_cash`, `expenses`, `purchase_orders`, `notifications`, `conversations`, `messages`, `loyalty_points`, `reviews`

---

## Deployment

Deployed on **Render** via `render.yaml`. Auto-deploys on push to `main`.

```
Build:  pip install -r requirements.txt
Start:  uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

All secrets are configured via the Render dashboard environment variables — never commit real values to `.env`.

---

## Troubleshooting

**Port in use:**
```bash
lsof -i :8000
kill -9 <PID>
```

**CORS errors:** Add your frontend URL to `BACKEND_CORS_ORIGINS` in `.env`

**Database connection error:** Verify `DATABASE_URL` and that your Supabase project is active

**Supabase URL limit errors:** The backend uses batched `.in_()` queries (100 IDs per batch) to avoid PostgREST URL length limits
