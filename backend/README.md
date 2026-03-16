# Premier Hotel Backend API

FastAPI backend for the Premier Hotel Management System, backed by Supabase (PostgreSQL).

---

## Stack

- **FastAPI** — web framework
- **Uvicorn** — ASGI server
- **Supabase** — PostgreSQL database and authentication
- **SQLAlchemy 2.0** — ORM
- **Pydantic V2** — data validation
- **python-jose** — JWT handling
- **passlib/bcrypt** — password hashing
- **WebSockets** — real-time communication

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
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SECRET_KEY=your-32-char-secret     # generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET_KEY=your-jwt-secret
```

### 3. Run the server

```bash
# Development
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

API available at: http://localhost:8000
Interactive docs: http://localhost:8000/docs
ReDoc: http://localhost:8000/redoc

---

## Project Structure

```
backend/
├── app/
│   ├── main.py             # App entry point, middleware, startup
│   ├── api/                # Route handlers (auth, rooms, bookings, orders, etc.)
│   ├── core/               # Config, security, dependencies
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic request/response schemas
│   ├── services/           # Business logic (payments, email, M-Pesa, etc.)
│   ├── middleware/         # Custom middleware
│   ├── utils/              # Helper utilities
│   ├── websocket/          # WebSocket connection manager
│   └── templates/          # Email templates
├── migrations/             # SQL migration scripts
├── supabase_schema.sql     # Full database schema (27+ tables)
├── requirements.txt
└── create_admin.sh         # Script to create a super admin account
```

---

## API Endpoints

### Authentication
```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
PATCH  /api/v1/auth/profile
POST   /api/v1/auth/change-password
```

### Rooms & Bookings
```
GET    /api/v1/rooms
GET    /api/v1/rooms/available
GET    /api/v1/rooms/{id}
POST   /api/v1/rooms                    (Admin)
PUT    /api/v1/rooms/{id}               (Admin)
DELETE /api/v1/rooms/{id}               (Admin)

GET    /api/v1/bookings                 (Admin/Manager)
GET    /api/v1/bookings/my-bookings
POST   /api/v1/bookings
PATCH  /api/v1/bookings/{id}
POST   /api/v1/bookings/{id}/cancel
POST   /api/v1/bookings/{id}/check-in   (Staff)
POST   /api/v1/bookings/{id}/check-out  (Staff)
```

### Menu & Orders
```
GET    /api/v1/menu/items
POST   /api/v1/menu/items               (Admin/Manager)
PUT    /api/v1/menu/items/{id}          (Admin/Manager)
DELETE /api/v1/menu/items/{id}          (Admin/Manager)

GET    /api/v1/orders                   (Staff)
GET    /api/v1/orders/my-orders
POST   /api/v1/orders
GET    /api/v1/orders/{id}
PATCH  /api/v1/orders/{id}/status       (Staff)
GET    /api/v1/orders/kitchen           (Chef)
```

### Payments
```
POST   /api/v1/payments/initiate
POST   /api/v1/payments/mpesa/callback
GET    /api/v1/payments/status/{id}
```

### Staff & Housekeeping
```
GET    /api/v1/staff
POST   /api/v1/staff/attendance
GET    /api/v1/staff/performance

GET    /api/v1/housekeeping/tasks
POST   /api/v1/housekeeping/inspections
GET    /api/v1/housekeeping/supplies
```

### Real-time
```
WS     /api/v1/ws          WebSocket connection
```

Full documentation available at `/docs` when the server is running.

---

## Database

Run `supabase_schema.sql` in your Supabase SQL editor to create all tables.

Key tables: `profiles`, `rooms`, `bookings`, `menu_items`, `orders`, `payments`, `staff`, `housekeeping_tasks`, `inventory`, `notifications`, `conversations`, `messages`

---

## Troubleshooting

**Port in use:**
```bash
lsof -i :8000
kill -9 <PID>
```

**CORS errors:** Add your frontend URL to `ALLOWED_ORIGINS` in `.env`

**Database connection error:** Verify `DATABASE_URL` and check that your Supabase project is active
