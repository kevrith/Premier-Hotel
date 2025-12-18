import { api } from '../client';

/**
 * Bookings API Service
 * Handles all booking-related API calls
 */

const bookingService = {
  /**
   * Get all bookings for current user
   * @param {Object} params - Query parameters (status, page, limit)
   * @returns {Promise} - List of bookings
   */
  getMyBookings: async (params = {}) => {
    const response = await api.get('/bookings/my-bookings', { params });
    return response.data;
  },

  /**
   * Get booking by ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise} - Booking details
   */
  getBookingById: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}`);
    return response.data;
  },

  /**
   * Create new booking
   * @param {Object} bookingData - Booking data
   * @returns {Promise} - Created booking
   */
  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  /**
   * Update booking
   * @param {string} bookingId - Booking ID
   * @param {Object} updateData - Updated booking data
   * @returns {Promise} - Updated booking
   */
  updateBooking: async (bookingId, updateData) => {
    const response = await api.patch(`/bookings/${bookingId}`, updateData);
    return response.data;
  },

  /**
   * Cancel booking
   * @param {string} bookingId - Booking ID
   * @param {string} reason - Cancellation reason (optional)
   * @returns {Promise} - Updated booking
   */
  cancelBooking: async (bookingId, reason = '') => {
    const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Check in to booking
   * @param {string} bookingId - Booking ID
   * @returns {Promise} - Updated booking
   */
  checkIn: async (bookingId) => {
    const response = await api.post(`/bookings/${bookingId}/check-in`);
    return response.data;
  },

  /**
   * Check out from booking
   * @param {string} bookingId - Booking ID
   * @returns {Promise} - Updated booking
   */
  checkOut: async (bookingId) => {
    const response = await api.post(`/bookings/${bookingId}/check-out`);
    return response.data;
  },

  /**
   * Get booking invoice/receipt
   * @param {string} bookingId - Booking ID
   * @returns {Promise} - Invoice data
   */
  getInvoice: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/invoice`);
    return response.data;
  },

  /**
   * Download booking receipt (PDF)
   * @param {string} bookingId - Booking ID
   * @returns {Promise} - PDF blob
   */
  downloadReceipt: async (bookingId) => {
    const response = await api.get(`/bookings/${bookingId}/receipt`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Process payment for booking
   * @param {string} bookingId - Booking ID
   * @param {Object} paymentData - Payment information
   * @returns {Promise} - Payment confirmation
   */
  processPayment: async (bookingId, paymentData) => {
    const response = await api.post(`/bookings/${bookingId}/payment`, paymentData);
    return response.data;
  },

  /**
   * Verify payment status
   * @param {string} bookingId - Booking ID
   * @param {string} paymentId - Payment ID
   * @returns {Promise} - Payment status
   */
  verifyPayment: async (bookingId, paymentId) => {
    const response = await api.get(`/bookings/${bookingId}/payment/${paymentId}/verify`);
    return response.data;
  },

  // Admin/Manager functions

  /**
   * Get all bookings (Admin/Manager only)
   * @param {Object} params - Query parameters (status, date, room, customer)
   * @returns {Promise} - List of all bookings
   */
  getAllBookings: async (params = {}) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  /**
   * Update booking status (Admin/Manager only)
   * @param {string} bookingId - Booking ID
   * @param {string} status - New status (pending, confirmed, checked-in, completed, cancelled)
   * @returns {Promise} - Updated booking
   */
  updateBookingStatus: async (bookingId, status) => {
    const response = await api.patch(`/bookings/${bookingId}/status`, { status });
    return response.data;
  },

  /**
   * Get booking statistics (Admin/Manager only)
   * @param {Object} params - Query parameters (startDate, endDate)
   * @returns {Promise} - Booking statistics
   */
  getBookingStats: async (params = {}) => {
    const response = await api.get('/bookings/stats', { params });
    return response.data;
  },

  /**
   * Get occupancy report (Admin/Manager only)
   * @param {Object} params - Query parameters (startDate, endDate)
   * @returns {Promise} - Occupancy data
   */
  getOccupancyReport: async (params = {}) => {
    const response = await api.get('/bookings/occupancy', { params });
    return response.data;
  },
};

export default bookingService;
