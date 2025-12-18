# 🏨 Premier Hotel Management System

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6.svg?logo=typescript)
![React](https://img.shields.io/badge/React-19.2.0-61dafb.svg?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-009688.svg?logo=fastapi)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![PWA](https://img.shields.io/badge/PWA-enabled-purple.svg)

**A comprehensive, production-ready hotel management application with multi-role interfaces, real-time communication, and offline capabilities.**

[Features](#-features) • [Tech Stack](#-tech-stack) • [Installation](#-installation) • [Documentation](#-documentation) • [Screenshots](#-screenshots)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Usage](#-usage)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Premier Hotel Management System is a full-stack web application designed to streamline hotel operations and enhance guest experiences. Built with modern technologies, it provides a unified platform for managing bookings, food orders, staff operations, housekeeping, payments, and guest communication.

### Key Highlights

- 🎯 **Multi-Role System** - Separate interfaces for Customers, Staff (Manager, Waiter, Chef, Cleaner), and Administrators
- 💳 **Payment Integration** - M-Pesa STK Push, Cash, and Card payment support
- 🔔 **Real-Time Communication** - WebSocket-powered notifications and messaging
- 📱 **Progressive Web App** - Installable, works offline, mobile-responsive
- 🌐 **Internationalization** - English and Swahili language support
- 🔒 **Enterprise Security** - JWT authentication, Row-Level Security, role-based access control
- 📊 **Advanced Analytics** - Comprehensive reporting and business insights

---

## ✨ Features

### For Guests

- ✅ **Room Booking System**
  - Browse available rooms with advanced filtering
  - Real-time availability checking
  - Secure online booking with instant confirmation
  - Digital check-in/check-out process

- ✅ **Food Ordering**
  - Browse interactive menu with categories
  - Customize orders with special instructions
  - Real-time order tracking (6-stage progress)
  - Delivery to room or location

- ✅ **Payment Options**
  - M-Pesa STK Push integration
  - Cash payments
  - Card payments (framework ready)

- ✅ **Guest Services**
  - Service request submission
  - In-app messaging with staff
  - Rate and review experiences
  - Loyalty points program
  - Notification preferences

### For Hotel Staff

#### 👔 Manager Dashboard
- Staff management (CRUD, shifts, attendance, performance)
- Revenue and operational reports
- Inventory and expense tracking
- System overview and analytics

#### 👨‍🍳 Chef Interface
- Kitchen queue management
- Order preparation tracking
- Real-time order notifications
- Ingredient management

#### 🍽️ Waiter Interface
- Table and order management
- Delivery tracking
- Customer service requests
- Order status updates

#### 🧹 Cleaner Interface
- Room cleaning task queue
- Housekeeping supplies tracking
- Room inspection checklists
- Lost and found management

### For Administrators

- 📊 **Complete System Oversight**
  - Real-time dashboard with key metrics
  - User and staff management
  - Payment tracking and reconciliation
  - System configuration

- 📈 **Advanced Analytics**
  - Revenue trends and forecasting
  - Occupancy rates
  - Popular items tracking
  - Staff performance metrics

- 🔐 **Security Management**
  - Role-based access control
  - Audit logging
  - System health monitoring

### System Features

- ⚡ **Real-Time Updates** - WebSocket connections for instant notifications
- 📧 **Email Notifications** - Automated emails for bookings, payments, and orders
- 🔔 **Multi-Channel Notifications** - Browser, sound, in-app, and email alerts
- 📱 **Offline Support** - IndexedDB caching with automatic sync
- 🌓 **Dark Mode** - Automatic day/night theme switching
- 🔍 **Advanced Search** - Filter and search across all entities
- 📊 **Data Export** - Export reports to PDF/Excel
- 🌍 **Multi-Language** - English and Swahili translations

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI framework with hooks and context |
| **TypeScript** | 5.9.3 | Static type checking (strict mode) + JSDoc |
| **Vite** | 7.2.4 | Fast build tool and dev server |
| **Tailwind CSS** | 3.4.18 | Utility-first styling |
| **Radix UI** | Latest | Accessible component primitives |
| **Zustand** | 5.0.9 | State management |
| **React Query** | 5.90.12 | Data fetching and caching |
| **Socket.IO Client** | 4.8.1 | Real-time communication |
| **Axios** | 1.13.2 | HTTP client |
| **Dexie** | 4.2.1 | IndexedDB wrapper for offline |
| **i18next** | 25.7.2 | Internationalization |
| **Formik + Yup** | 2.4.9 / 1.7.1 | Form handling and validation |
| **Chart.js** | 4.5.1 | Data visualization |
| **Lucide React** | 0.554.0 | Icon library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.109.0 | High-performance web framework |
| **Uvicorn** | 0.27.0 | ASGI server |
| **PostgreSQL** | Latest | Primary database (via Supabase) |
| **Supabase** | 2.x | Backend-as-a-Service (Auth, DB, Storage) |
| **SQLAlchemy** | 2.0.25 | ORM and database toolkit |
| **asyncpg** | 0.29.0 | Async PostgreSQL driver |
| **Pydantic** | 2.5.3 | Data validation |
| **python-jose** | 3.3.0 | JWT token handling |
| **passlib** | 1.7.4 | Password hashing (bcrypt) |
| **Redis** | 5.0.1 | Caching layer (optional) |
| **WebSockets** | 12.0 | Real-time communication |

### Infrastructure

- **Deployment**: Vercel (Frontend), Railway/Render (Backend)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (images, attachments)
- **Email**: Gmail SMTP
- **Payment Gateway**: Safaricom Daraja API (M-Pesa)
- **Monitoring**: Built-in logging and error tracking

---

## 🏗️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile PWA  │  │   Tablet     │      │
│  │   (React)    │  │   (React)    │  │   (React)    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
└────────────────────────────┼─────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │
                    │   (Nginx/CDN)   │
                    └────────┬────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                     Application Layer                         │
│                    ┌────────▼────────┐                        │
│                    │   FastAPI App   │                        │
│                    │   (Uvicorn)     │                        │
│                    └────────┬────────┘                        │
│         ┌──────────────────┼──────────────────┐              │
│         │                  │                  │              │
│  ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐       │
│  │   Auth      │  │   Business    │  │  WebSocket  │       │
│  │ Middleware  │  │    Logic      │  │   Manager   │       │
│  └─────────────┘  └───────┬───────┘  └─────────────┘       │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                       Data Layer                              │
│         ┌──────────────────┼──────────────────┐              │
│         │                  │                  │              │
│  ┌──────▼──────┐  ┌───────▼───────┐  ┌──────▼──────┐       │
│  │  PostgreSQL │  │  Redis Cache  │  │   Storage   │       │
│  │  (Supabase) │  │   (Optional)  │  │  (Supabase) │       │
│  └─────────────┘  └───────────────┘  └─────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema (27 Tables)

**Core Entities**: `profiles`, `rooms`, `bookings`, `menu_items`, `orders`, `payments`

**Staff Management**: `staff`, `staff_shifts`, `staff_attendance`, `staff_performance`, `staff_leaves`

**Housekeeping**: `housekeeping_tasks`, `room_inspections`, `housekeeping_supplies`, `supply_usage`, `housekeeping_schedules`, `lost_and_found`

**Service Requests**: `service_request_types`, `service_requests`, `service_request_status_history`, `service_request_attachments`, `service_request_comments`

**Communication**: `notifications`, `notification_preferences`, `conversations`, `conversation_participants`, `messages`, `message_attachments`

**Reviews & Analytics**: `reviews`, `review_responses`, `review_images`, `loyalty_points`, `expenses`, `inventory`, `analytics_data`

---

## 📦 Installation

### Prerequisites

- **Node.js** >= 18.x
- **Python** >= 3.10
- **PostgreSQL** (via Supabase account)
- **Git**

### Quick Start

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/premier-hotel.git
cd premier-hotel
```

#### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Configure environment variables (see Configuration section)
nano .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### 3. Backend Setup

```bash
# Navigate to backend directory
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

# Create environment file
cp .env.example .env

# Configure environment variables
nano .env

# Run database migrations
python -m alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

#### 4. Database Setup

```bash
# Connect to Supabase and run the schema
psql -h your-supabase-host -U postgres -d postgres -f backend/supabase_schema.sql
```

---

## ⚙️ Configuration

### Frontend Environment Variables

Create `.env` in the project root:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_WS_URL=ws://localhost:8000/api/v1/ws

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
VITE_APP_NAME=Premier Hotel
VITE_APP_VERSION=1.1.0

# Payment Configuration (Optional)
VITE_MPESA_SHORTCODE=174379
VITE_STRIPE_PUBLIC_KEY=pk_test_xxx
```

### Backend Environment Variables

Create `.env` in the `backend` directory:

```env
# Application
APP_NAME=Premier Hotel API
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32

# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Email Configuration (Gmail SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@premierhotel.com
SMTP_FROM_NAME=Premier Hotel

# M-Pesa Configuration
MPESA_ENVIRONMENT=sandbox  # or production
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_CALLBACK_URL=https://your-domain.com/api/v1/payments/mpesa/callback

# Redis (Optional)
REDIS_URL=redis://localhost:6379/0

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Logging
LOG_LEVEL=INFO
```

---

## 🚀 Usage

### Development Mode

```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 3: WebSocket Server (if separate)
python backend/app/services/websocket_manager.py
```

### Production Build

```bash
# Build frontend
npm run build

# Preview production build
npm run preview

# Run backend in production
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Testing

```bash
# Frontend tests
npm run test

# Backend tests
cd backend
pytest

# Run specific test file
pytest tests/test_auth.py -v
```

### Linting

```bash
# Frontend
npm run lint

# Backend
cd backend
flake8 app/
black app/ --check
```

---

## 📚 API Documentation

### Interactive API Documentation

Once the backend is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### API Endpoints Overview

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user

#### Rooms & Bookings
- `GET /api/v1/rooms` - List all rooms
- `GET /api/v1/rooms/{id}` - Get room details
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings/my-bookings` - User's bookings

#### Orders & Menu
- `GET /api/v1/menu` - Get menu items
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/{id}` - Track order status

#### Payments
- `POST /api/v1/payments/initiate` - Initiate payment
- `POST /api/v1/payments/mpesa/callback` - M-Pesa callback
- `GET /api/v1/payments/status/{id}` - Check payment status

#### Staff Management
- `GET /api/v1/staff` - List staff members
- `POST /api/v1/staff/attendance` - Clock in/out
- `GET /api/v1/staff/performance` - Performance metrics

#### Housekeeping
- `GET /api/v1/housekeeping/tasks` - Get cleaning tasks
- `POST /api/v1/housekeeping/inspections` - Submit inspection
- `GET /api/v1/housekeeping/supplies` - Check supplies

#### Notifications & Messaging
- `GET /api/v1/notifications` - Get notifications
- `POST /api/v1/messages` - Send message
- `WS /api/v1/ws` - WebSocket connection

**Full API documentation with 100+ endpoints available at `/docs`**

---

## 🗄️ Database Schema

### Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   profiles  │────────▶│   bookings  │◀───────│    rooms    │
│             │         │             │         │             │
│ - user_id   │         │ - id        │         │ - id        │
│ - email     │         │ - user_id   │         │ - number    │
│ - role      │         │ - room_id   │         │ - type      │
│ - loyalty   │         │ - status    │         │ - status    │
└─────┬───────┘         │ - payment   │         └─────────────┘
      │                 └─────────────┘
      │
      │         ┌─────────────┐         ┌─────────────┐
      ├────────▶│   orders    │────────▶│ menu_items  │
      │         │             │         │             │
      │         │ - id        │         │ - id        │
      │         │ - user_id   │         │ - name      │
      │         │ - status    │         │ - price     │
      │         │ - total     │         │ - category  │
      │         └─────────────┘         └─────────────┘
      │
      │         ┌─────────────┐
      └────────▶│  payments   │
                │             │
                │ - id        │
                │ - user_id   │
                │ - amount    │
                │ - method    │
                │ - status    │
                └─────────────┘
```

### Key Tables

**Users & Authentication**
```sql
profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('customer', 'admin', 'manager', 'staff', 'chef', 'waiter', 'cleaner')),
  loyalty_points INTEGER DEFAULT 0,
  created_at TIMESTAMP
)
```

**Bookings**
```sql
bookings (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  room_id UUID REFERENCES rooms(id),
  check_in DATE,
  check_out DATE,
  guests INTEGER,
  status TEXT,
  total_amount DECIMAL,
  payment_status TEXT,
  created_at TIMESTAMP
)
```

**Payments**
```sql
payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  order_id UUID REFERENCES orders(id),
  amount DECIMAL NOT NULL,
  payment_method TEXT CHECK (payment_method IN ('mpesa', 'cash', 'card')),
  status TEXT CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  transaction_id TEXT,
  phone_number TEXT,
  created_at TIMESTAMP
)
```

**Full schema with 27 tables available in** `backend/supabase_schema.sql`

---

## 📸 Screenshots

<details>
<summary>Click to view screenshots</summary>

### Customer Interface
![Landing Page](docs/screenshots/landing.png)
![Room Booking](docs/screenshots/booking.png)
![Food Menu](docs/screenshots/menu.png)
![Order Tracking](docs/screenshots/order-tracking.png)

### Staff Dashboards
![Admin Dashboard](docs/screenshots/admin-dashboard.png)
![Chef Kitchen](docs/screenshots/chef-kitchen.png)
![Waiter Interface](docs/screenshots/waiter.png)

### Mobile & PWA
![Mobile Menu](docs/screenshots/mobile-menu.png)
![Mobile Booking](docs/screenshots/mobile-booking.png)

</details>

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Coding Standards

- Follow **PEP 8** for Python code
- Use **ESLint** and **Prettier** for JavaScript/React
- Write meaningful commit messages
- Add tests for new features
- Update documentation

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

**Development Team**
- Lead Developer: [Your Name](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- [React](https://react.dev/) - UI framework
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [Supabase](https://supabase.com/) - Backend infrastructure
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Radix UI](https://www.radix-ui.com/) - UI components
- [Safaricom Daraja](https://developer.safaricom.co.ke/) - M-Pesa integration

---

## 📞 Support

For support, email support@premierhotel.com or create an issue in the GitHub repository.

---

## 🗺️ Roadmap

- [x] Phase 1: Core functionality
- [x] Phase 2: Payment integration (M-Pesa, Cash, Card)
- [x] Phase 3: Staff management & operations
- [x] Phase 4: Real-time features & PWA
- [x] Phase 5: TypeScript migration (145 files, strict mode)
- [x] Phase 6: TypeScript strict mode + JSDoc documentation
- [ ] Phase 7: QuickBooks POS 2013 integration
- [ ] Phase 8: Advanced analytics dashboards
- [ ] Phase 9: Multi-property support
- [ ] Phase 10: AI-powered features

---

<div align="center">

**Built with ❤️ by the Premier Hotel Team**

[⬆ Back to Top](#-premier-hotel-management-system)

</div>
