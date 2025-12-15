import { api } from '../client';

/**
 * Rooms API Service
 * Handles all room-related API calls
 */

const roomService = {
  /**
   * Get all rooms with optional filters
   * @param {Object} params - Query parameters (type, minPrice, maxPrice, occupancy, etc.)
   * @returns {Promise} - List of rooms
   */
  getAllRooms: async (params = {}) => {
    const response = await api.get('/rooms', { params });
    return response.data;
  },

  /**
   * Get room by ID
   * @param {string} roomId - Room ID
   * @returns {Promise} - Room details
   */
  getRoomById: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}`);
    return response.data;
  },

  /**
   * Get room availability
   * @param {string} roomId - Room ID
   * @param {string} checkIn - Check-in date (ISO format)
   * @param {string} checkOut - Check-out date (ISO format)
   * @returns {Promise} - Availability status
   */
  checkAvailability: async (roomId, checkIn, checkOut) => {
    const response = await api.post(`/rooms/${roomId}/availability`, {
      checkIn,
      checkOut,
    });
    return response.data;
  },

  /**
   * Get available rooms for date range
   * @param {string} checkIn - Check-in date (ISO format)
   * @param {string} checkOut - Check-out date (ISO format)
   * @param {number} guests - Number of guests
   * @returns {Promise} - List of available rooms
   */
  getAvailableRooms: async (checkIn, checkOut, guests) => {
    const response = await api.get('/rooms/available', {
      params: { checkIn, checkOut, guests },
    });
    return response.data;
  },

  /**
   * Get room amenities
   * @param {string} roomId - Room ID
   * @returns {Promise} - List of amenities
   */
  getRoomAmenities: async (roomId) => {
    const response = await api.get(`/rooms/${roomId}/amenities`);
    return response.data;
  },

  /**
   * Get room reviews
   * @param {string} roomId - Room ID
   * @param {Object} params - Query parameters (page, limit)
   * @returns {Promise} - List of reviews
   */
  getRoomReviews: async (roomId, params = {}) => {
    const response = await api.get(`/rooms/${roomId}/reviews`, { params });
    return response.data;
  },

  /**
   * Create room review
   * @param {string} roomId - Room ID
   * @param {Object} reviewData - Review data (rating, comment)
   * @returns {Promise} - Created review
   */
  createReview: async (roomId, reviewData) => {
    const response = await api.post(`/rooms/${roomId}/reviews`, reviewData);
    return response.data;
  },

  // Admin/Manager functions

  /**
   * Create new room (Admin/Manager only)
   * @param {Object} roomData - Room data
   * @returns {Promise} - Created room
   */
  createRoom: async (roomData) => {
    const response = await api.post('/rooms', roomData);
    return response.data;
  },

  /**
   * Update room (Admin/Manager only)
   * @param {string} roomId - Room ID
   * @param {Object} roomData - Updated room data
   * @returns {Promise} - Updated room
   */
  updateRoom: async (roomId, roomData) => {
    const response = await api.put(`/rooms/${roomId}`, roomData);
    return response.data;
  },

  /**
   * Delete room (Admin only)
   * @param {string} roomId - Room ID
   * @returns {Promise}
   */
  deleteRoom: async (roomId) => {
    const response = await api.delete(`/rooms/${roomId}`);
    return response.data;
  },

  /**
   * Update room status (Cleaner/Manager)
   * @param {string} roomId - Room ID
   * @param {string} status - Room status (available, occupied, cleaning, maintenance)
   * @returns {Promise} - Updated room
   */
  updateRoomStatus: async (roomId, status) => {
    const response = await api.patch(`/rooms/${roomId}/status`, { status });
    return response.data;
  },

  /**
   * Upload room images (Admin/Manager)
   * @param {string} roomId - Room ID
   * @param {FormData} formData - Form data with images
   * @returns {Promise} - Updated room with new images
   */
  uploadRoomImages: async (roomId, formData) => {
    const response = await api.upload(`/rooms/${roomId}/images`, formData);
    return response.data;
  },
};

export default roomService;
