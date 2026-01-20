import { create } from 'zustand';
import { db } from '@/db/schema';
import bookingService from '@/lib/api/services/bookingService';

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
      // Transform frontend booking data to backend format
      const apiBookingData = {
        room_id: bookingData.roomId,
        check_in_date: bookingData.checkIn,
        check_out_date: bookingData.checkOut,
        total_guests: bookingData.guests,
        guest_info: {
          first_name: bookingData.guestInfo.firstName,
          last_name: bookingData.guestInfo.lastName,
          email: bookingData.guestInfo.email,
          phone: bookingData.guestInfo.phone,
          id_number: bookingData.guestInfo.idNumber
        },
        special_requests: bookingData.specialRequests
      };

      // Call actual backend API
      const createdBooking = await bookingService.createBooking(apiBookingData);

      // Save to IndexedDB for offline support
      try {
        await db.bookings.add({
          ...createdBooking,
          userId: createdBooking.customer_id || 'guest',
          checkIn: new Date(createdBooking.check_in_date),
          checkOut: new Date(createdBooking.check_out_date)
        });
      } catch (dbError) {
        console.warn('Failed to save to IndexedDB:', dbError);
        // Continue even if offline save fails
      }

      set((state) => ({
        bookings: [...state.bookings, createdBooking],
        currentBooking: createdBooking,
        isLoading: false
      }));

      return { success: true, booking: createdBooking };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Booking failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  fetchBookings: async (customerId) => {
    set({ isLoading: true, error: null });
    try {
      // Call actual backend API to fetch user's bookings
      const fetchedBookings = await bookingService.getMyBookings();

      // Update IndexedDB cache
      try {
        await db.bookings.clear();
        for (const booking of fetchedBookings) {
          await db.bookings.add({
            ...booking,
            userId: booking.customer_id || customerId,
            checkIn: new Date(booking.check_in_date),
            checkOut: new Date(booking.check_out_date)
          });
        }
      } catch (dbError) {
        console.warn('Failed to update IndexedDB cache:', dbError);
      }

      set({ bookings: fetchedBookings, isLoading: false });
    } catch (error) {
      // If API call fails, try to fetch from IndexedDB (offline fallback)
      try {
        const cachedBookings = await db.bookings
          .where('userId')
          .equals(customerId)
          .toArray();

        if (cachedBookings.length > 0) {
          set({ bookings: cachedBookings, isLoading: false });
          console.warn('Using cached bookings due to API error');
          return;
        }
      } catch (dbError) {
        console.error('Failed to fetch from IndexedDB:', dbError);
      }

      const errorMessage = error.response?.data?.detail || error.message || 'Failed to fetch bookings';
      set({ error: errorMessage, isLoading: false });
    }
  },

  updateBooking: async (bookingId, updates) => {
    set({ isLoading: true, error: null });
    try {
      // Call actual backend API to update booking
      const updatedBooking = await bookingService.updateBooking(bookingId, updates);

      // Update in IndexedDB cache
      try {
        await db.bookings.update(bookingId, updatedBooking);
      } catch (dbError) {
        console.warn('Failed to update IndexedDB cache:', dbError);
      }

      set((state) => ({
        bookings: state.bookings.map((booking) =>
          booking.id === bookingId ? updatedBooking : booking
        ),
        isLoading: false
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to update booking';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  cancelBooking: async (bookingId, reason = '') => {
    set({ isLoading: true, error: null });
    try {
      // Call actual backend API to cancel booking
      const cancelledBooking = await bookingService.cancelBooking(bookingId, reason);

      // Update in IndexedDB cache
      try {
        await db.bookings.update(bookingId, cancelledBooking);
      } catch (dbError) {
        console.warn('Failed to update IndexedDB cache:', dbError);
      }

      set((state) => ({
        bookings: state.bookings.map((booking) =>
          booking.id === bookingId ? cancelledBooking : booking
        ),
        isLoading: false
      }));

      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to cancel booking';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  clearCurrentBooking: () => {
    set({ currentBooking: null });
  },

  clearError: () => set({ error: null })
}));

export { useBookingStore };
export default useBookingStore;
