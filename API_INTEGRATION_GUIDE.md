# 🔌 API Integration Guide - Premier Hotel PWA

This guide explains how to integrate the frontend with your backend API.

---

## 📋 Table of Contents

1. [Setup](#setup)
2. [API Client Configuration](#api-client-configuration)
3. [Available Services](#available-services)
4. [Usage Examples](#usage-examples)
5. [Error Handling](#error-handling)
6. [WebSocket Integration](#websocket-integration)
7. [Testing with Mock Backend](#testing-with-mock-backend)

---

## 🚀 Setup

### 1. Environment Configuration

Create a `.env` file in the project root (copy from `.env.example`):

```bash
# Copy the example file
cp .env.example .env
```

Update the values:

```env
# Your backend API URL
VITE_API_BASE_URL=http://localhost:3000/api

# WebSocket URL
VITE_WS_URL=ws://localhost:3000
```

### 2. Backend API Requirements

Your backend should implement these endpoints:

#### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password

#### Room Endpoints
- `GET /api/rooms` - Get all rooms (with filters)
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/availability` - Check availability
- `GET /api/rooms/available` - Get available rooms
- `POST /api/rooms/:id/reviews` - Create review

#### Booking Endpoints
- `GET /api/bookings/my-bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `POST /api/bookings` - Create booking
- `PATCH /api/bookings/:id` - Update booking
- `POST /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/payment` - Process payment

#### Menu/Order Endpoints
- `GET /api/menu/items` - Get menu items
- `GET /api/orders/my-orders` - Get user orders
- `POST /api/orders` - Create order
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/orders/kitchen` - Get kitchen orders (Chef)

#### User Management Endpoints (Admin)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

---

## 🔧 API Client Configuration

The API client is pre-configured with:

✅ **Automatic Authentication** - JWT tokens added to requests
✅ **Token Refresh** - Automatic token refresh on 401 errors
✅ **Error Handling** - Global error handling with toast notifications
✅ **Request/Response Logging** - Development mode logging
✅ **Timeout Handling** - 30-second request timeout

Located at: `src/lib/api/client.js`

---

## 📦 Available Services

All services are located in `src/lib/api/services/`:

### 1. **authService**
Authentication and user profile management

```javascript
import { authService } from '@/lib/api/services';

// Login
const { user, access_token } = await authService.login(email, password);

// Register
const { user, access_token } = await authService.register(userData);

// Get current user
const user = await authService.getCurrentUser();

// Update profile
const updatedUser = await authService.updateProfile({ firstName, lastName });
```

### 2. **roomService**
Room management and booking

```javascript
import { roomService } from '@/lib/api/services';

// Get all rooms
const rooms = await roomService.getAllRooms({ type: 'deluxe', maxPrice: 15000 });

// Get room details
const room = await roomService.getRoomById(roomId);

// Check availability
const isAvailable = await roomService.checkAvailability(roomId, checkIn, checkOut);

// Get available rooms
const availableRooms = await roomService.getAvailableRooms(checkIn, checkOut, guests);
```

### 3. **bookingService**
Booking management

```javascript
import { bookingService } from '@/lib/api/services';

// Create booking
const booking = await bookingService.createBooking({
  roomId: 'room-123',
  checkInDate: '2025-12-20',
  checkOutDate: '2025-12-23',
  guests: 2,
  specialRequests: 'Late check-in'
});

// Get my bookings
const myBookings = await bookingService.getMyBookings();

// Cancel booking
await bookingService.cancelBooking(bookingId, 'Change of plans');
```

### 4. **menuService**
Menu and order management

```javascript
import { menuService } from '@/lib/api/services';

// Get menu items
const menuItems = await menuService.getAllMenuItems({ category: 'mains' });

// Create order
const order = await menuService.createOrder({
  items: [
    { itemId: 'item-1', quantity: 2, customizations: ['Extra Cheese'] }
  ],
  location: 'Room 305',
  specialInstructions: 'No onions'
});

// Get kitchen orders (Chef)
const kitchenOrders = await menuService.getKitchenOrders({ status: 'pending' });

// Update order status
await menuService.updateOrderStatus(orderId, 'in-progress');
```

### 5. **userService**
User and staff management (Admin/Manager)

```javascript
import { userService } from '@/lib/api/services';

// Get all users
const users = await userService.getAllUsers({ role: 'staff' });

// Create staff member
const staff = await userService.createUser({
  email: 'chef@hotel.com',
  role: 'chef',
  firstName: 'Mario',
  lastName: 'Chef'
});

// Update user role
await userService.updateUserRole(userId, 'manager');
```

---

## 💡 Usage Examples

### Example 1: Update AuthStore to Use Real API

Edit `src/stores/authStore.js`:

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '@/lib/api/services';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Real API login
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login(email, password);

          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            role: response.user.role,
            isAuthenticated: true,
            isLoading: false
          });

          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      // Real API register
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.register(userData);

          set({
            user: response.user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            role: response.user.role,
            isAuthenticated: true,
            isLoading: false
          });

          return { success: true };
        } catch (error) {
          set({ error: error.message, isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: () => {
        authService.logout().catch(console.error);
        set({
          user: null,
          token: null,
          refreshToken: null,
          role: null,
          isAuthenticated: false,
          error: null
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        role: state.role,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

export default useAuthStore;
```

### Example 2: Fetch Real Rooms Data

In your `Rooms.jsx` component:

```javascript
import { useState, useEffect } from 'react';
import { roomService } from '@/lib/api/services';
import { toast } from 'react-hot-toast';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    minPrice: 0,
    maxPrice: 20000,
    guests: 1
  });

  useEffect(() => {
    fetchRooms();
  }, [filters]);

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const data = await roomService.getAllRooms(filters);
      setRooms(data.rooms || data);
    } catch (error) {
      toast.error('Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  };

  // Rest of component...
}
```

### Example 3: Create Booking with Real API

In your `RoomBooking.jsx`:

```javascript
import { bookingService } from '@/lib/api/services';
import { toast } from 'react-hot-toast';

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const booking = await bookingService.createBooking({
      roomId: roomId,
      checkInDate: formData.checkIn,
      checkOutDate: formData.checkOut,
      guests: formData.guests,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      idNumber: formData.idNumber,
      specialRequests: formData.specialRequests,
      paymentMethod: formData.paymentMethod,
      mpesaPhone: formData.mpesaPhone
    });

    toast.success('Booking created successfully!');
    navigate('/my-bookings');
  } catch (error) {
    toast.error(error.message || 'Failed to create booking');
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🚨 Error Handling

The API client handles errors globally, but you can also handle specific errors:

```javascript
try {
  const data = await roomService.getRoomById(roomId);
  // Handle success
} catch (error) {
  if (error.response) {
    // Server responded with error
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);

    switch (error.response.status) {
      case 404:
        toast.error('Room not found');
        navigate('/rooms');
        break;
      case 403:
        toast.error('You do not have permission');
        break;
      default:
        toast.error('An error occurred');
    }
  } else if (error.request) {
    // Request made but no response
    toast.error('Network error. Please check your connection.');
  } else {
    // Something else happened
    toast.error('An unexpected error occurred');
  }
}
```

---

## 🔌 WebSocket Integration

The SocketContext is ready for WebSocket integration. Update `src/contexts/SocketContext.jsx`:

```javascript
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to WebSocket server
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    const newSocket = io(WS_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
```

### Using WebSocket in Components

```javascript
import { useSocket } from '@/contexts/SocketContext';
import { useEffect } from 'react';

function ChefDashboard() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for new orders
    socket.on('new-order', (order) => {
      console.log('New order received:', order);
      setOrders(prev => [order, ...prev]);
      toast.success(`New order from ${order.location}`);
    });

    // Listen for order updates
    socket.on('order-updated', (updatedOrder) => {
      setOrders(prev => prev.map(o =>
        o.id === updatedOrder.id ? updatedOrder : o
      ));
    });

    return () => {
      socket.off('new-order');
      socket.off('order-updated');
    };
  }, [socket]);

  // Emit events
  const updateOrderStatus = (orderId, status) => {
    if (socket) {
      socket.emit('update-order-status', { orderId, status });
    }
  };

  // Rest of component...
}
```

---

## 🧪 Testing with Mock Backend

For development without a backend, use Mock Service Worker (MSW):

### 1. Install MSW

```bash
npm install --save-dev msw
```

### 2. Create Mock Handlers

Create `src/mocks/handlers.js`:

```javascript
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:3000/api';

export const handlers = [
  // Mock login
  http.post(`${API_URL}/auth/login`, () => {
    return HttpResponse.json({
      user: {
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'customer'
      },
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    });
  }),

  // Mock rooms
  http.get(`${API_URL}/rooms`, () => {
    return HttpResponse.json({
      rooms: [
        {
          id: '1',
          room_number: '101',
          type: 'Standard Room',
          base_price: 5000,
          images: ['https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=600']
        }
      ]
    });
  }),
];
```

### 3. Setup MSW

Create `src/mocks/browser.js`:

```javascript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### 4. Start MSW in Development

In `src/main.jsx`:

```javascript
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass'
  });
}
```

---

## ✅ Checklist for Backend Integration

- [ ] Set up environment variables (`.env`)
- [ ] Update `authStore.js` to use real API
- [ ] Update `bookingStore.js` to use real API
- [ ] Update `cartStore.js` to use real API (for orders)
- [ ] Update all page components to fetch real data
- [ ] Test authentication flow (login, register, logout)
- [ ] Test booking creation and management
- [ ] Test order creation and kitchen workflow
- [ ] Set up WebSocket for real-time updates
- [ ] Test staff dashboards with real data
- [ ] Add error boundaries for API errors
- [ ] Test offline functionality with IndexedDB

---

## 🚀 Next Steps

1. **Set up your backend API** following the endpoint structure above
2. **Update environment variables** with your API URL
3. **Replace mock data** in stores with API service calls
4. **Test thoroughly** with real backend
5. **Deploy** frontend and backend together

---

## 📚 Additional Resources

- [Axios Documentation](https://axios-http.com/docs/intro)
- [React Query](https://tanstack.com/query/latest) - For better data fetching
- [Socket.IO](https://socket.io/docs/v4/) - WebSocket library
- [MSW Documentation](https://mswjs.io/) - API mocking

---

**Need help?** Check the inline comments in the service files or create an issue in the repository.
