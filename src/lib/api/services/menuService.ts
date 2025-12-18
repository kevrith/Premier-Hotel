import { api } from '../client';

/**
 * Menu & Orders API Service
 * Handles all menu and order-related API calls
 */

const menuService = {
  // Menu Items

  /**
   * Get all menu items with optional filters
   * @param {Object} params - Query parameters (category, available, search)
   * @returns {Promise} - List of menu items
   */
  getAllMenuItems: async (params = {}) => {
    const response = await api.get('/menu/items', { params });
    return response.data;
  },

  /**
   * Get menu item by ID
   * @param {string} itemId - Menu item ID
   * @returns {Promise} - Menu item details
   */
  getMenuItem: async (itemId) => {
    const response = await api.get(`/menu/items/${itemId}`);
    return response.data;
  },

  /**
   * Get menu categories
   * @returns {Promise} - List of categories
   */
  getCategories: async () => {
    const response = await api.get('/menu/categories');
    return response.data;
  },

  /**
   * Get popular menu items
   * @param {number} limit - Number of items to return
   * @returns {Promise} - List of popular items
   */
  getPopularItems: async (limit = 10) => {
    const response = await api.get('/menu/popular', { params: { limit } });
    return response.data;
  },

  // Orders

  /**
   * Create new order
   * @param {Object} orderData - Order data (items, location, special instructions)
   * @returns {Promise} - Created order
   */
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  /**
   * Get my orders
   * @param {Object} params - Query parameters (status, page, limit)
   * @returns {Promise} - List of orders
   */
  getMyOrders: async (params = {}) => {
    const response = await api.get('/orders/my-orders', { params });
    return response.data;
  },

  /**
   * Get order by ID
   * @param {string} orderId - Order ID
   * @returns {Promise} - Order details
   */
  getOrderById: async (orderId) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Cancel order
   * @param {string} orderId - Order ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise} - Updated order
   */
  cancelOrder: async (orderId, reason = '') => {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },

  /**
   * Track order status
   * @param {string} orderId - Order ID
   * @returns {Promise} - Order status and tracking info
   */
  trackOrder: async (orderId) => {
    const response = await api.get(`/orders/${orderId}/track`);
    return response.data;
  },

  /**
   * Rate order/food
   * @param {string} orderId - Order ID
   * @param {Object} ratingData - Rating and review
   * @returns {Promise} - Created rating
   */
  rateOrder: async (orderId, ratingData) => {
    const response = await api.post(`/orders/${orderId}/rate`, ratingData);
    return response.data;
  },

  // Staff functions

  /**
   * Get orders for kitchen (Chef)
   * @param {Object} params - Query parameters (status, priority)
   * @returns {Promise} - List of kitchen orders
   */
  getKitchenOrders: async (params = {}) => {
    const response = await api.get('/orders/kitchen', { params });
    return response.data;
  },

  /**
   * Update order status (Chef/Waiter)
   * @param {string} orderId - Order ID
   * @param {string} status - New status (pending, in-progress, ready, delivered, completed)
   * @returns {Promise} - Updated order
   */
  updateOrderStatus: async (orderId, status) => {
    const response = await api.patch(`/orders/${orderId}/status`, { status });
    return response.data;
  },

  /**
   * Assign order to waiter (Manager)
   * @param {string} orderId - Order ID
   * @param {string} waiterId - Waiter ID
   * @returns {Promise} - Updated order
   */
  assignOrder: async (orderId, waiterId) => {
    const response = await api.post(`/orders/${orderId}/assign`, { waiterId });
    return response.data;
  },

  /**
   * Get orders by table/room (Waiter)
   * @param {string} location - Table number or room number
   * @returns {Promise} - List of orders for location
   */
  getOrdersByLocation: async (location) => {
    const response = await api.get('/orders/by-location', {
      params: { location },
    });
    return response.data;
  },

  /**
   * Mark order as delivered (Waiter)
   * @param {string} orderId - Order ID
   * @returns {Promise} - Updated order
   */
  markDelivered: async (orderId) => {
    const response = await api.post(`/orders/${orderId}/deliver`);
    return response.data;
  },

  // Admin/Manager functions

  /**
   * Create menu item (Admin/Manager/Chef)
   * @param {Object} itemData - Menu item data
   * @returns {Promise} - Created item
   */
  createMenuItem: async (itemData) => {
    const response = await api.post('/menu/items', itemData);
    return response.data;
  },

  /**
   * Update menu item (Admin/Manager/Chef)
   * @param {string} itemId - Menu item ID
   * @param {Object} itemData - Updated item data
   * @returns {Promise} - Updated item
   */
  updateMenuItem: async (itemId, itemData) => {
    const response = await api.put(`/menu/items/${itemId}`, itemData);
    return response.data;
  },

  /**
   * Delete menu item (Admin only)
   * @param {string} itemId - Menu item ID
   * @returns {Promise}
   */
  deleteMenuItem: async (itemId) => {
    const response = await api.delete(`/menu/items/${itemId}`);
    return response.data;
  },

  /**
   * Update item availability (Chef)
   * @param {string} itemId - Menu item ID
   * @param {boolean} isAvailable - Availability status
   * @returns {Promise} - Updated item
   */
  updateItemAvailability: async (itemId, isAvailable) => {
    const response = await api.patch(`/menu/items/${itemId}/availability`, {
      isAvailable,
    });
    return response.data;
  },

  /**
   * Get order statistics (Admin/Manager)
   * @param {Object} params - Query parameters (startDate, endDate)
   * @returns {Promise} - Order statistics
   */
  getOrderStats: async (params = {}) => {
    const response = await api.get('/orders/stats', { params });
    return response.data;
  },

  /**
   * Get all orders (Admin/Manager)
   * @param {Object} params - Query parameters (status, date, customer)
   * @returns {Promise} - List of all orders
   */
  getAllOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  /**
   * Upload menu item image (Admin/Manager)
   * @param {string} itemId - Menu item ID
   * @param {FormData} formData - Form data with image
   * @returns {Promise} - Updated item with new image
   */
  uploadItemImage: async (itemId, formData) => {
    const response = await api.upload(`/menu/items/${itemId}/image`, formData);
    return response.data;
  },
};

export default menuService;
