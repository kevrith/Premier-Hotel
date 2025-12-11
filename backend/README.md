# 🚀 Premier Hotel Backend API - FastAPI + Supabase

A production-ready FastAPI backend integrated with Supabase for the Premier Hotel Management System.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [Prerequisites](#prerequisites)
4. [Supabase Setup](#supabase-setup)
5. [Local Development](#local-development)
6. [API Documentation](#api-documentation)
7. [Deployment](#deployment)
8. [Testing](#testing)

---

## ✨ Features

- ✅ **FastAPI** - Modern, fast Python web framework
- ✅ **Supabase Integration** - Authentication, Database, Storage, Realtime
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Row Level Security** - Database-level access control
- ✅ **Automatic API Docs** - Swagger UI & ReDoc
- ✅ **WebSocket Support** - Real-time updates
- ✅ **CORS Enabled** - Frontend integration ready
- ✅ **Type Safety** - Pydantic models
- ✅ **Async/Await** - High performance async operations

---

## 🛠 Tech Stack

- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth + JWT
- **ORM**: SQLAlchemy 2.0 (optional)
- **Validation**: Pydantic V2
- **Server**: Uvicorn
- **Real-time**: WebSockets + Supabase Realtime

---

## 📦 Prerequisites

- Python 3.10 or higher
- Supabase account (free tier available)
- Git

---

## 🔧 Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up / Log in
3. Click "New Project"
4. Enter:
   - **Name**: Premier Hotel
   - **Database Password**: (save this!)
   - **Region**: Choose closest to you
5. Wait for project to be created (~2 minutes)

### Step 2: Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "+ New Query"
3. Copy the entire contents of `supabase_schema.sql`
4. Paste and click **Run**
5. Verify tables are created in **Table Editor**

### Step 3: Get API Keys

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### Step 4: Enable Realtime (Optional)

1. Go to **Database** → **Replication**
2. Enable replication for these tables:
   - `orders`
   - `bookings`
3. This enables real-time subscriptions

### Step 5: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. (Optional) Enable **Google**, **GitHub**, etc.
4. Go to **URL Configuration**:
   - Site URL: `http://localhost:5173`
   - Redirect URLs: Add `http://localhost:5173/**`

---

## 💻 Local Development

### 1. Install Python Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your Supabase credentials
nano .env  # or use your favorite editor
```

Update these values in `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SECRET_KEY=generate-a-random-32-char-string
```

To generate a secure SECRET_KEY:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. Run the Server

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Server will start at: **http://localhost:8000**

### 4. Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

---

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login user
POST   /api/v1/auth/logout            - Logout user
POST   /api/v1/auth/refresh           - Refresh access token
GET    /api/v1/auth/me                - Get current user
PATCH  /api/v1/auth/profile           - Update profile
POST   /api/v1/auth/change-password   - Change password
```

### Room Endpoints

```
GET    /api/v1/rooms                  - Get all rooms
GET    /api/v1/rooms/{id}             - Get room details
POST   /api/v1/rooms                  - Create room (Admin)
PUT    /api/v1/rooms/{id}             - Update room (Admin)
DELETE /api/v1/rooms/{id}             - Delete room (Admin)
POST   /api/v1/rooms/{id}/availability - Check availability
GET    /api/v1/rooms/available        - Get available rooms
```

### Booking Endpoints

```
GET    /api/v1/bookings               - Get all bookings (Admin)
GET    /api/v1/bookings/my-bookings   - Get user bookings
GET    /api/v1/bookings/{id}          - Get booking details
POST   /api/v1/bookings               - Create booking
PATCH  /api/v1/bookings/{id}          - Update booking
POST   /api/v1/bookings/{id}/cancel   - Cancel booking
POST   /api/v1/bookings/{id}/check-in  - Check in
POST   /api/v1/bookings/{id}/check-out - Check out
```

### Menu & Order Endpoints

```
GET    /api/v1/menu/items             - Get menu items
GET    /api/v1/menu/items/{id}        - Get menu item
POST   /api/v1/menu/items             - Create item (Admin)
PUT    /api/v1/menu/items/{id}        - Update item (Admin)
DELETE /api/v1/menu/items/{id}        - Delete item (Admin)

GET    /api/v1/orders                 - Get all orders (Staff)
GET    /api/v1/orders/my-orders       - Get user orders
POST   /api/v1/orders                 - Create order
GET    /api/v1/orders/{id}            - Get order details
PATCH  /api/v1/orders/{id}/status     - Update order status
GET    /api/v1/orders/kitchen         - Get kitchen orders (Chef)
```

---

## 🚀 Deployment

### Deploy to Heroku

1. **Install Heroku CLI**
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download from heroku.com/cli
```

2. **Create Heroku App**
```bash
heroku login
heroku create premier-hotel-api
```

3. **Set Environment Variables**
```bash
heroku config:set SUPABASE_URL=https://your-project.supabase.co
heroku config:set SUPABASE_KEY=your-anon-key
heroku config:set SUPABASE_SERVICE_KEY=your-service-role-key
heroku config:set DATABASE_URL=your-database-url
heroku config:set SECRET_KEY=your-secret-key
```

4. **Create Procfile**
```bash
echo "web: uvicorn app.main:app --host 0.0.0.0 --port \$PORT" > Procfile
```

5. **Deploy**
```bash
git add .
git commit -m "Initial deployment"
git push heroku main
```

### Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Select "Deploy from GitHub repo"
4. Connect your repository
5. Add environment variables in Railway dashboard
6. Deploy!

### Deploy to Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables
6. Deploy!

---

## 🧪 Testing

### Run Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio httpx

# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

### Test API with cURL

```bash
# Register
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","first_name":"John","last_name":"Doe"}'

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Get rooms (with token)
curl -X GET http://localhost:8000/api/v1/rooms \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 📊 Database Migrations

Using Alembic for database migrations:

```bash
# Initialize Alembic
alembic init alembic

# Create migration
alembic revision --autogenerate -m "Add new table"

# Run migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

---

## 🔒 Security Considerations

1. **Never commit `.env`** - Use `.env.example` as template
2. **Rotate SECRET_KEY** - Change periodically
3. **Use service_role key carefully** - Only for admin operations
4. **Enable RLS** - Row Level Security is enabled by default
5. **Rate limiting** - Consider adding rate limiting middleware
6. **HTTPS only** - Use HTTPS in production

---

## 🐛 Troubleshooting

### Connection Refused
```bash
# Check if server is running
lsof -i :8000

# Kill process if needed
kill -9 <PID>
```

### Database Connection Error
- Verify DATABASE_URL in `.env`
- Check Supabase project is active
- Verify password doesn't contain special characters

### CORS Error
- Add frontend URL to `BACKEND_CORS_ORIGINS` in `.env`
- Check CORS middleware configuration in `main.py`

---

## 📞 Support

- **Issues**: Create an issue on GitHub
- **Email**: support@premierhotel.com
- **Documentation**: Check `/docs` endpoint

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ using FastAPI and Supabase**
