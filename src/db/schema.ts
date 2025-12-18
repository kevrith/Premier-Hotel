import Dexie from 'dexie';

export const db = new Dexie('PremierHotelDB');

db.version(1).stores({
  // Orders - for offline food ordering
  orders: '++id, userId, status, createdAt',

  // Bookings - for room reservations
  bookings: '++id, userId, status, checkIn, checkOut',

  // Menu items - cached for offline browsing
  menuItems: 'id, category, name, isAvailable',

  // Cart items - persistent cart
  cartItems: '++id, itemId, quantity',

  // Pending sync queue - for offline changes
  pendingSync: '++id, action, entityType, timestamp, priority',

  // User favorites
  favorites: '++id, userId, itemId, type',

  // Cached API responses
  cache: 'key, timestamp'
});

// Initialize database
db.open().catch((err) => {
  console.error('Failed to open database:', err);
});

export default db;
