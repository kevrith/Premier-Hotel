import { create } from 'zustand';
import { db } from '@/db/schema';

const useBookingStore = create((set, get) => ({
  // State
  currentBooking: null,
  bookings: [],
  searchFilters: {
    checkIn: null,
    checkOut: null,
    guests: 1,
    roomType: null,
    minPrice: 0,
    maxPrice: 10000
  },
  isLoading: false,
  error: null,

  // Actions
  setSearchFilters: (filters) => {
    set((state) => ({
      searchFilters: { ...state.searchFilters, ...filters }
    }));
  },

  setCurrentBooking: (booking) => {
    set({ currentBooking: booking });
  },

  createBooking: async (bookingData) => {
    set({ isLoading: true, error: null });
    try {
      // Mock implementation - replace with actual API call
      const newBooking = {
        id: Date.now().toString(),
        ...bookingData,
        bookingReference: `BK-${Date.now()}`,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      // Save to IndexedDB for offline support
      await db.bookings.add({
        ...newBooking,
        userId: bookingData.customerId || 'guest',
        checkIn: new Date(bookingData.checkInDate),
        checkOut: new Date(bookingData.checkOutDate)
      });

      set((state) => ({
        bookings: [...state.bookings, newBooking],
        currentBooking: newBooking,
        isLoading: false
      }));

      return { success: true, booking: newBooking };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  fetchBookings: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      // Try to fetch from IndexedDB first (offline support)
      const cachedBookings = await db.bookings
        .where('userId')
        .equals(customerId)
        .toArray();

      if (cachedBookings.length > 0) {
        set({ bookings: cachedBookings, isLoading: false });
        return;
      }

      // Mock API call
      const mockBookings = [
        {
          id: '1',
          bookingReference: 'BK-123456',
          roomId: 'room-1',
          roomNumber: '101',
          roomType: 'Deluxe Suite',
          checkInDate: new Date(Date.now() + 86400000).toISOString(),
          checkOutDate: new Date(Date.now() + 86400000 * 3).toISOString(),
          guests: 2,
          status: 'confirmed',
          totalAmount: 15000,
          paidAmount: 5000
        }
      ];

      set({ bookings: mockBookings, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateBooking: async (bookingId, updates) => {
    set({ isLoading: true, error: null });
    try {
      // Update in IndexedDB
      await db.bookings.update(bookingId, updates);

      set((state) => ({
        bookings: state.bookings.map((booking) =>
          booking.id === bookingId ? { ...booking, ...updates } : booking
        ),
        isLoading: false
      }));

      return { success: true };
    } catch (error) {
      set({ error: error.message, isLoading: false });
      return { success: false, error: error.message };
    }
  },

  cancelBooking: async (bookingId) => {
    return get().updateBooking(bookingId, { status: 'cancelled' });
  },

  clearCurrentBooking: () => {
    set({ currentBooking: null });
  },

  clearError: () => set({ error: null })
}));

export default useBookingStore;
