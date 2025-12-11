# Backend Setup Instructions

## Prerequisites

Make sure you have Python 3.10+ installed with pip.

## Installation Steps

### 1. Install python3-full (if needed)

```bash
sudo apt update
sudo apt install python3-full python3-pip python3-venv -y
```

### 2. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
```

### 3. Activate Virtual Environment

```bash
source venv/bin/activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Verify Environment Setup

The `.env` file is already configured with your Supabase credentials.

### 6. Run the Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000

### 7. Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user
- `PATCH /api/v1/auth/profile` - Update profile
- `POST /api/v1/auth/change-password` - Change password

### Rooms
- `GET /api/v1/rooms` - Get all rooms
- `GET /api/v1/rooms/available` - Get available rooms
- `GET /api/v1/rooms/{id}` - Get room details
- `POST /api/v1/rooms/{id}/availability` - Check availability

### Bookings
- `GET /api/v1/bookings/my-bookings` - Get user bookings
- `POST /api/v1/bookings` - Create booking
- `POST /api/v1/bookings/{id}/cancel` - Cancel booking
- `POST /api/v1/bookings/{id}/check-in` - Check in (Staff)
- `POST /api/v1/bookings/{id}/check-out` - Check out (Staff)

### Menu
- `GET /api/v1/menu/items` - Get menu items
- `GET /api/v1/menu/items/{id}` - Get menu item
- `POST /api/v1/menu/items` - Create item (Admin)

### Orders
- `GET /api/v1/orders/my-orders` - Get user orders
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders/kitchen` - Kitchen orders (Chef)
- `PATCH /api/v1/orders/{id}/status` - Update status (Staff)

## Testing the API

### 1. Register a User

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+254712345678"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234!"
  }'
```

Save the `access_token` from the response.

### 3. Get Rooms (Authenticated)

```bash
curl -X GET http://localhost:8000/api/v1/rooms \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Get Available Rooms

```bash
curl -X GET "http://localhost:8000/api/v1/rooms/available?check_in=2025-12-20&check_out=2025-12-25" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. Create a Booking

```bash
curl -X POST http://localhost:8000/api/v1/bookings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "ROOM_ID_FROM_ROOMS_LIST",
    "check_in_date": "2025-12-20",
    "check_out_date": "2025-12-25",
    "total_guests": 2,
    "guest_info": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "phone": "+254712345678"
    }
  }'
```

### 6. Get Menu Items

```bash
curl -X GET "http://localhost:8000/api/v1/menu/items?category=mains" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 7. Create an Order

```bash
curl -X POST http://localhost:8000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Table 5",
    "location_type": "table",
    "items": [
      {
        "menu_item_id": "MENU_ITEM_ID",
        "name": "Grilled Salmon",
        "quantity": 1,
        "price": 1200
      }
    ]
  }'
```

## Connecting Frontend

Update your frontend `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## Troubleshooting

### Port Already in Use

If port 8000 is in use:
```bash
lsof -i :8000
kill -9 <PID>
```

Or use a different port:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Database Connection Error

- Verify `.env` credentials
- Check Supabase project is active
- Test connection: https://njhjpxfozgpoiqwksple.supabase.co

### Import Errors

Make sure you're in the virtual environment:
```bash
source venv/bin/activate
```

Reinstall dependencies:
```bash
pip install -r requirements.txt
```
